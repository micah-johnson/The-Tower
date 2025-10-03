import React, { useRef, useState } from "@rbxts/react";
import { useEffect } from "@rbxts/react";
import { GuiService, TweenService, UserInputService, RunService, Workspace } from "@rbxts/services";
import { useTweenableState } from "../../hooks/tween";
import { adjustForInset } from "../util";

function isShiftLocked() {
	return UserInputService.MouseBehavior === Enum.MouseBehavior.LockCenter;
}

const TRAIL_SIZE = 12;
const TRAIL_END = 8;
const TRAIL_LIFETIME = 0.1;
const TRAIL_SPACING = 6;
const TRAIL_POOL = 32;

export function Cursor() {
	const ref = useRef<Frame>();
	const trailFolderRef = useRef<Folder>();

	const [position, setPosition] = useState(Vector2.zero);
	const [rotation, setRotation] = useTweenableState(ref, "Rotation", -45, new TweenInfo(0.2, Enum.EasingStyle.Cubic));
	const [size, setSize] = useTweenableState(ref, "Size", UDim2.fromOffset(12, 12), new TweenInfo(0.05, Enum.EasingStyle.Linear));

	useEffect(() => {
		// trail container under same parent as the cursor frame
		const trailFolder = new Instance("Folder");
		trailFolder.Name = "CursorTrail";
		trailFolderRef.current = trailFolder;
		trailFolder.Parent = (ref.current?.Parent as Instance) ?? undefined;

		// simple object pool
		const pool = new Array<Frame>();
		const inUse = new Set<Frame>();
		for (let i = 0; i < TRAIL_POOL; i++) pool.push(makeCrumb(trailFolder));

		let lastPos = new Vector2(-1e9, -1e9);
		let hbConn: RBXScriptConnection | undefined;

		UserInputService.MouseIconEnabled = false;

		const moveConn = UserInputService.InputChanged.Connect((input) => {
			if (input.UserInputType === Enum.UserInputType.MouseMovement) {
				const raw = new Vector2(input.Position.X, input.Position.Y);
				const p = adjustForInset(raw);
				setPosition(p);
				trySpawn(p);
			}
		});

		const mouseDown = UserInputService.InputBegan.Connect((input) => {
			if (input.UserInputType === Enum.UserInputType.MouseButton1) {
				if (!isShiftLocked()) setSize(UDim2.fromOffset(15, 15));
			} else if (input.UserInputType === Enum.UserInputType.MouseButton2) {
				if (!isShiftLocked()) setRotation(45);
			}
		});

		const mouseUp = UserInputService.InputEnded.Connect((input) => {
			if (input.UserInputType === Enum.UserInputType.MouseButton1) {
				setSize(UDim2.fromOffset(12, 12));
			} else if (input.UserInputType === Enum.UserInputType.MouseButton2) {
				setRotation(-45);
			}
		});

		const lockChanged = UserInputService.GetPropertyChangedSignal("MouseBehavior").Connect(() => {
			lastPos = new Vector2(-1e9, -1e9);
			hbConn?.Disconnect();
			if (isShiftLocked()) {
				hbConn = RunService.Heartbeat.Connect(() => {
					const cam = Workspace.CurrentCamera;
					if (!cam) return;
					const vps = cam.ViewportSize;
					const center = new Vector2(vps.X / 2, vps.Y / 2);
					trySpawn(center);
				});
			}
		});

		const trySpawn = (p: Vector2) => {
			if (lastPos.sub(p).Magnitude >= TRAIL_SPACING) {
				lastPos = p;
				const crumb = checkout();
				crumb.Position = UDim2.fromOffset(p.X, p.Y);
				playTween(crumb, () => checkin(crumb));
			}
		};

		const checkout = () => {
			const f = pool.pop() ?? makeCrumb(trailFolder);
			inUse.add(f);
			f.Visible = true;
			f.Size = UDim2.fromOffset(TRAIL_SIZE, TRAIL_SIZE);
			f.BackgroundTransparency = 0;
			return f;
		};

		const checkin = (f: Frame) => {
			f.Visible = false;
			inUse.delete(f);
			if (pool.size() < TRAIL_POOL) pool.push(f);
			else f.Destroy();
		};

		const cleanup = () => {
			UserInputService.MouseIconEnabled = true;
			moveConn.Disconnect();
			mouseDown.Disconnect();
			mouseUp.Disconnect();
			lockChanged.Disconnect();
			hbConn?.Disconnect();
			for (const f of inUse) f.Destroy();
			for (const f of pool) f.Destroy();
			trailFolder.Destroy();
		};

		return cleanup;
	}, []);

	return (
		<>
			<frame
				Rotation={rotation}
				ref={ref}
				Size={size}
				Position={UDim2.fromOffset(position.X, position.Y)}
				BackgroundColor3={Color3.fromHex("#f5f5f5")}
				BorderSizePixel={0}
				AnchorPoint={new Vector2(0.5, 0.5)}
				ZIndex={99999}
			>
				<uistroke Color={Color3.fromHex("#171717")} Thickness={2} Transparency={0.85} />
			</frame>
		</>
	);
}

function makeCrumb(parent: Instance) {
	const f = new Instance("Frame");
	f.AnchorPoint = new Vector2(0.5, 0.5);
	f.BackgroundColor3 = new Color3(1, 1, 1);
	f.BorderSizePixel = 0;
	f.Size = UDim2.fromOffset(TRAIL_SIZE, TRAIL_SIZE);
	f.Visible = false;
	f.ZIndex = 99998;
	f.Parent = parent;
    f.Rotation = 45

	const stroke = new Instance("UIStroke");
	stroke.Thickness = 0;
	stroke.Parent = f;

	return f;
}

function playTween(crumb: Frame, onDone: () => void) {
	const tween = TweenService.Create(
		crumb,
		new TweenInfo(TRAIL_LIFETIME, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
		{ BackgroundTransparency: 1, Size: UDim2.fromOffset(TRAIL_END, TRAIL_END) },
	);
	tween.Play();
	task.delay(TRAIL_LIFETIME, onDone);
}