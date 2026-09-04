// components/checkbox-field.tsx
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { FieldError } from "./field-error"

type CheckboxFieldProps<T extends FieldValues> = {
    label: string
    id: Path<T>
    control: Control<T>
    error?: string
}

export function CheckboxField<T extends FieldValues>({label, id, control, error}: CheckboxFieldProps<T>) {
    return (
        <Controller
            name={id}
            control={control}
            render={({ field }) => (
                <div className="space-y-1 flex flex-col items-center">
                    <Label htmlFor={id} className="block">{label}</Label>
                    <Checkbox id={id} checked={field.value} onCheckedChange={field.onChange} />
                    <FieldError message={error} />
                </div>
            )}
        />
    //     <Controller
    //         name={id}
    //         control={control}
    //         render={({ field }) => (
    //             <div className="space-y-1">
    //                 <Label htmlFor={id} className="invisible block">{label}</Label>
    //                 <div className="flex items-center gap-2">
    //                     <Checkbox id={id}
    //                         checked={field.value}
    //                         onCheckedChange={field.onChange}
    //                     />
    //                     <Label htmlFor={id}>{label}</Label>
    //                 </div>
                    
    //                 <FieldError message={error} />
    //             </div>
    //         )}
    //     />
    )
}