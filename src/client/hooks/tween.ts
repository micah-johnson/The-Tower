import { MutableRefObject, useRef, useState } from "@rbxts/react";
import { TweenService } from "@rbxts/services";

type TweenableSet<T> = {
    [K in keyof T]-?: T[K] extends Tweenable ? K : never
}[keyof T];

export function useTweenableState<T, K extends TweenableSet<NonNullable<T>>> (
    ref: MutableRefObject<T>, 
    property: K | K[],
    initialValue: NonNullable<T>[K], 
    tweenInfo: TweenInfo
): LuaTuple<[NonNullable<T>[K], (value: NonNullable<T>[K]) => void]> {
    const [value, setValue] = useState(initialValue)

    function tweenValue(value: NonNullable<T>[K]) {
        // If no ref available return immediately
        if (!ref.current) {
            setValue(value)

            return
        }

        const properties: Map<K, any> = new Map

        if (typeOf(property) === "string") {
            properties.set(property as K, value)
        } else {
            (property as K[]).forEach(p => {
                properties.set(p, value)
            })
        }

        const tween = TweenService.Create(ref.current as unknown as Instance, tweenInfo, properties as Partial<ExtractMembers<Instance, Tweenable>>);

        tween.Completed.Once(() => setValue(value));
        tween.Play();
    }

    return $tuple(value, tweenValue)
}
