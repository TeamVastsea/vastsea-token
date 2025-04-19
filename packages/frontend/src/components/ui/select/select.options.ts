import type { AcceptableValue } from 'reka-ui';
import { createInjectionState } from '@vueuse/core';
import { ref, type Ref } from 'vue';

export interface OptionProps<T extends AcceptableValue> {
  label: string;
  value: T;
}
export interface SelectProps<OV extends AcceptableValue> {
  options?: OptionProps<OV>[];
}

export type SelectContext = {
  renderOptions: Ref<OptionProps<AcceptableValue>[]>;
  values: Ref<AcceptableValue[]>;
}

export const [useProvide, useContext] = createInjectionState((
  defaultValue: SelectContext
) => {
  const renderOptions:Ref<OptionProps<AcceptableValue>[]> = ref(defaultValue.renderOptions.value);
  const values = ref(defaultValue.values.value);
  return {renderOptions, values};
}, { injectionKey: Symbol('Select') });
