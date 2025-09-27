import React, { useState } from "@rbxts/react";
import { createPortal, createRoot } from "@rbxts/react-roblox";
import { Players } from "@rbxts/services";

interface AppProps {}

function App({}: AppProps) {
	const [count, setCount] = useState(0);

	return (
		<screengui ResetOnSpawn={false} IgnoreGuiInset={true}>
			<frame
				key="MainFrame"
				Size={new UDim2(0, 400, 0, 300)}
				Position={new UDim2(0.5, -200, 0.5, -150)}
				BackgroundColor3={new Color3(0.2, 0.2, 0.2)}
				BorderSizePixel={0}
			>
				<uicorner CornerRadius={new UDim(0, 12)} />
				<textlabel
					key="Title"
					Text="The Tower - React App"
					Size={new UDim2(1, 0, 0, 50)}
					Position={new UDim2(0, 0, 0, 0)}
					BackgroundTransparency={1}
					TextColor3={new Color3(1, 1, 1)}
					TextScaled={true}
					Font={Enum.Font.SourceSansBold}
				/>
				<textlabel
					key="Counter"
					Text={`Count: ${count}`}
					Size={new UDim2(1, 0, 0, 40)}
					Position={new UDim2(0, 0, 0, 60)}
					BackgroundTransparency={1}
					TextColor3={new Color3(0.9, 0.9, 0.9)}
					TextScaled={true}
					Font={Enum.Font.SourceSans}
				/>
				<textbutton
					key="IncrementButton"
					Text="Increment"
					Size={new UDim2(0.4, 0, 0, 50)}
					Position={new UDim2(0.3, 0, 0.5, 0)}
					BackgroundColor3={new Color3(0.3, 0.7, 0.3)}
					TextColor3={new Color3(1, 1, 1)}
					TextScaled={true}
					Font={Enum.Font.SourceSans}
					Event={{
						MouseButton1Click: () => setCount(count + 1),
					}}
				>
					<uicorner CornerRadius={new UDim(0, 8)} />
				</textbutton>
				<textbutton
					key="DecrementButton"
					Text="Decrement"
					Size={new UDim2(0.4, 0, 0, 50)}
					Position={new UDim2(0.3, 0, 0.7, 0)}
					BackgroundColor3={new Color3(0.7, 0.3, 0.3)}
					TextColor3={new Color3(1, 1, 1)}
					TextScaled={true}
					Font={Enum.Font.SourceSans}
					Event={{
						MouseButton1Click: () => setCount(count - 1),
					}}
				>
					<uicorner CornerRadius={new UDim(0, 8)} />
				</textbutton>
			</frame>
		</screengui>
	);
}

export default App;