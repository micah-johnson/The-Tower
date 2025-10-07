import { Players, RunService, ContentProvider } from "@rbxts/services";

function getOrCreateHighlight(char: Model) {
  let h = char.FindFirstChild("_HitHighlight") as Highlight | undefined;
  if (!h) {
    h = new Instance("Highlight");
    h.Name = "_HitHighlight";
    h.Adornee = char;
    h.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop;
    h.OutlineTransparency = 1;
    h.Parent = char;
  }
  return h;
}

function fadeHighlight(char: Model, color: Color3, duration = 0.25, startFillTransparency = 0.15) {
  const h = getOrCreateHighlight(char);
  h.FillColor = color;
  h.FillTransparency = startFillTransparency;
  const t0 = os.clock();
  const t1 = t0 + duration;
  const conn = RunService.Heartbeat.Connect(() => {
    const now = os.clock();
    const alpha = math.clamp((now - t0) / duration, 0, 1);
    const eased = 1 - (1 - alpha) * (1 - alpha);
    h.FillTransparency = startFillTransparency + (1 - startFillTransparency) * eased;
    if (now >= t1) {
      h.FillTransparency = 1;
      conn.Disconnect();
    }
  });
}

const soundPool = new Map<Model, Map<string, Sound>>();

function getOrCreatePooledSound(char: Model, soundId: string, volume: number) {
  const hrp = char.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
  if (!hrp) return;
  let byId = soundPool.get(char);
  if (!byId) {
    byId = new Map<string, Sound>();
    soundPool.set(char, byId);
    char.AncestryChanged.Connect((_, parent) => {
      if (!parent || !char.IsDescendantOf(game)) {
        const map = soundPool.get(char);
        if (map) {
          map.forEach((s) => s.Destroy());
          soundPool.delete(char);
        }
      }
    });
  }
  let s = byId.get(soundId);
  if (!s) {
    s = new Instance("Sound");
    s.Name = "_HitSfx";
    s.SoundId = soundId;
    s.Volume = volume;
    s.RollOffMaxDistance = 80;
    s.Parent = hrp;
    byId.set(soundId, s);
    pcall(() => ContentProvider.PreloadAsync([s as Instance]));
  } else {
    s.Volume = volume;
    if (s.Parent !== hrp) s.Parent = hrp;
  }
  return s;
}

type SyncOpts = {
  visualDelay?: number;
  soundSeek?: number;
};

function playSynced(
  char: Model,
  color: Color3,
  duration: number,
  soundId?: string,
  volume = 0.75,
  opts: SyncOpts = {},
) {
  const visualDelay = opts.visualDelay ?? 0;
  const soundSeek = opts.soundSeek ?? 0;
  let s: Sound | undefined;
  if (soundId) s = getOrCreatePooledSound(char, soundId, volume);
  if (s && !s.IsLoaded) {
    const ready = new Instance("BindableEvent");
    const conn = s.GetPropertyChangedSignal("IsLoaded").Connect(() => {
      if (s!.IsLoaded) ready.Fire();
    });
    task.spawn(() => {
      while (!s!.IsLoaded) task.wait();
      ready.Fire();
    });
    ready.Event.Wait();
    conn.Disconnect();
    ready.Destroy();
  }
  const t0 = os.clock();
  RunService.Heartbeat.Once(() => {
    if (s) {
      s.TimePosition = soundSeek;
      s.Play();
    }
  });
  if (visualDelay <= 0) {
    RunService.Heartbeat.Once(() => fadeHighlight(char, color, duration));
  } else {
    const target = t0 + visualDelay;
    const waitConn = RunService.Heartbeat.Connect(() => {
      if (os.clock() >= target) {
        waitConn.Disconnect();
        fadeHighlight(char, color, duration);
      }
    });
  }
}

const lastEffectAt = new Map<Model, number>();
function shouldPlay(char: Model, window = 0.05) {
  const now = os.clock();
  const last = lastEffectAt.get(char) ?? 0;
  if (now - last < window) return false;
  lastEffectAt.set(char, now);
  return true;
}

function hookPlayerHumanoid(humanoid: Humanoid) {
  let lastHealth = humanoid.Health;
  humanoid.HealthChanged.Connect((health) => {
    const character = humanoid.Parent as Model | undefined;
    if (!character) {
      lastHealth = health;
      return;
    }
    const delta = health - lastHealth;
    if (delta < 0 && shouldPlay(character)) {
      playSynced(
        character,
        new Color3(1, 0, 0),
        0.25,
        "rbxassetid://111532815548658",
        0.75,
        { visualDelay: 0, soundSeek: 0.03 },
      );
    }
    if (delta > humanoid.MaxHealth / 10 && shouldPlay(character)) {
      playSynced(character, new Color3(0, 1, 0), 0.25);
    }
    lastHealth = health;
  });
}

function hookPlayerDamageEffect(player: Player) {
  player.CharacterAdded.Connect((character) => {
    const humanoid = character.WaitForChild("Humanoid") as Humanoid;
    if (!humanoid) return;
    hookPlayerHumanoid(humanoid);
  });

  // Hook into existing player character
  const humanoid = player.Character?.FindFirstChild("Humanoid") as Humanoid | undefined

  if (humanoid) hookPlayerHumanoid(humanoid)
}

export function hookDamageEffects() {
  Players.PlayerAdded.Connect(hookPlayerDamageEffect);
  Players.GetPlayers().forEach(hookPlayerDamageEffect);
}
