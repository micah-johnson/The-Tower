// Handles hurt effect (red highlight) + sound

import { Players, TweenService } from "@rbxts/services";

function flashHighlight(char: Model, color: Color3) {
  const existing = char.FindFirstChild("_HitHighlight") as Highlight | undefined;
  const h = existing ?? new Instance("Highlight");
  h.Name = "_HitHighlight";
  h.Adornee = char;
  h.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop;
  h.FillColor = color;
  h.OutlineTransparency = 1;
  h.FillTransparency = 0.15;
  if (!existing) h.Parent = char;

  const tween = TweenService.Create(
    h,
    new TweenInfo(1, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
    { FillTransparency: 1 },
  );
  tween.Play();
  tween.Completed.Once(() => {
    if (h.Parent) h.Destroy();
  });
}

function hookPlayerHumanoid(humanoid: Humanoid) {
    let lastHealth = humanoid.Health

    humanoid.HealthChanged.Connect((health) => {
      const rootPart = humanoid.Parent?.FindFirstChild("HumanoidRootPart")
      if (!rootPart) {
        lastHealth = health
        return
      }

      const delta = health - lastHealth

      // Handle audio
      if (delta < 0) {
        playSound(rootPart, "rbxassetid://111532815548658")
      }

      // Handle flashes
      if (delta < 0) { // Flash red on any damage 
        flashHighlight(humanoid.Parent as Model, new Color3(1,0,0))
      } else if (delta > humanoid.MaxHealth/10) { // Only flash green on significant healing (10% or more)
        flashHighlight(humanoid.Parent as Model, new Color3(0,1,0))
      }

      lastHealth = health
    })
}

function playSound(parent: Instance, soundId: string, volume = 0.75) {
  const s = new Instance("Sound");
  s.SoundId = soundId;
  s.Volume = volume;
  s.RollOffMaxDistance = 80;
  s.Parent = parent;
  s.Play();
  s.Ended.Once(() => s.Destroy());
  // hard-timeout cleanup in case Ended doesn’t fire
  task.delay(3, () => s.Parent && s.Destroy());
}

function hookPlayerDamageEffect(player: Player) {
    player.CharacterAdded.Connect(character => {
        const humanoid = character.WaitForChild("Humanoid") as Humanoid | undefined
        if (!humanoid) return;

        hookPlayerHumanoid(humanoid)
    })
}

export function hookDamageEffects() {
    Players.PlayerAdded.Connect(hookPlayerDamageEffect)
    Players.GetPlayers().forEach(hookPlayerDamageEffect)
}