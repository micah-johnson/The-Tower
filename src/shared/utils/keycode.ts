export function keyCodeToString(keyCode: Enum.KeyCode): string {
    const name = keyCode.Name;

    // Handle number row specially
    const numberMap: Record<string, string> = {
        One: "1",
        Two: "2",
        Three: "3",
        Four: "4",
        Five: "5",
        Six: "6",
        Seven: "7",
        Eight: "8",
        Nine: "9",
        Zero: "0",
    };

    return numberMap[name] ?? name;
}