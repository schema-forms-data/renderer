import { useController, type Control } from "react-hook-form";

interface DFHiddenProps {
  name: string;
  control: Control<Record<string, unknown>>;
}

const DFHidden = ({ name, control }: DFHiddenProps) => {
  const { field } = useController({ name, control });
  return (
    <input type="hidden" {...field} value={(field.value as string) ?? ""} />
  );
};

export default DFHidden;
