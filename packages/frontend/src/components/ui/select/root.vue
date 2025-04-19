<script lang="ts" setup generic="T extends AcceptableValue">
import type { AcceptableValue } from 'reka-ui';
import type { Ref } from 'vue';
import type { OptionProps, SelectProps } from './select.options';
import { vInfiniteScroll } from '@vueuse/components';
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxViewport,
} from 'reka-ui';
import { ref, toRefs, watch } from 'vue';
import SelectOption from './option.vue';
import { useProvide } from './select.options';

type FinalSelectOption = { multiple?: boolean; defaultOpen?: boolean; displayBehavior?: (val: T) => string } & SelectProps<T>;

const props = defineProps<FinalSelectOption>();
const emits = defineEmits<{
  scrollBottom: [];
}>();

const defaultDisplayBehavior = (val: T extends SelectProps<infer R> ? R : unknown) => {
  return val;
};

const modelValue = defineModel<AcceptableValue[]>();
const { options, multiple, displayBehavior = defaultDisplayBehavior } = toRefs(props);

const renderOptions: Ref<OptionProps<AcceptableValue>[]> = ref<OptionProps<AcceptableValue>[]>(
  [
    ...(options.value ?? []),
  ],
);

const values: Ref<AcceptableValue[]> = ref([]);

const onSelect = (value: AcceptableValue) => {
  if (multiple.value) {
    values.value = Array.isArray(value) ? value : [value];
    return;
  }
  if (!values.value.includes(value)) {
    values.value.push(value);
  }
};
const onScrollBottom = () => {
  emits('scrollBottom');
};

useProvide({
  renderOptions,
  values,
});
watch(options, () => {
  renderOptions.value = options.value ?? [];
}, { immediate: true });
watch(values, () => {
  modelValue.value = values.value;
});
</script>

<template>
  <combobox-root :multiple="multiple" :default-open="defaultOpen" highlight-on-hover @update:model-value="(value) => onSelect(value)">
    <combobox-anchor class="w-full">
      <combobox-trigger class="w-full cursor-pointer">
        <slot name="trigger">
          <div
            class="
              w-full bg-zinc-50 border border-solid border-zinc-300 rounded-md
              outline-size-0 py-1.5 px-2 cursor-pointer flex flex-wrap gap-2
              dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100 items-center min-h-10"
          >
            <div v-for="tag, idx in modelValue" :key="idx" class="w-fit h-fit bg-blue-500 text-white px-4 py-1 rounded">
              {{ displayBehavior?.(tag as T) }}
            </div>
          </div>
        </slot>
      </combobox-trigger>
    </combobox-anchor>
    <combobox-viewport>
      <combobox-content
        v-infinite-scroll="[onScrollBottom, { distance: 10 }]"
        class="w-[var(--reka-combobox-trigger-width)] h-[200px] overflow-y-scroll bg-white mt-4 flex flex-col gap-1 dark:bg-zinc-800 py-2 rounded"
      >
        <slot>
          <select-option v-for="option of renderOptions" :key="option.label" :label="option.label" :value="option.value" />
        </slot>
      </combobox-content>
    </combobox-viewport>
  </combobox-root>
</template>
