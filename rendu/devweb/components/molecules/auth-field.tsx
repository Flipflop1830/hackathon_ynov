import { Input, type InputProps } from "@/components/atoms/input";

export function AuthField({
  label,
  name,
  errors,
  ...props
}: InputProps & { label: string; name: string; errors?: string[] }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium text-zinc-300">
        {label}
      </label>
      <Input id={name} name={name} {...props} />
      {errors?.map((e) => (
        <p key={e} className="text-xs text-red-400">
          {e}
        </p>
      ))}
    </div>
  );
}
