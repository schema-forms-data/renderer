import type { Control } from "react-hook-form";
import type { FormContainer } from "@schema-forms-data/core";
import RegularContainerRenderer from "./RegularContainerRenderer";
import RepeatableContainerRenderer from "./RepeatableContainerRenderer";

interface ContainerRendererProps {
  container: FormContainer;
  control: Control<Record<string, unknown>>;
}

const ContainerRenderer = (props: ContainerRendererProps) => {
  if (props.container.repeatable && props.container.nome) {
    return <RepeatableContainerRenderer {...props} />;
  }
  return <RegularContainerRenderer {...props} />;
};

export default ContainerRenderer;
