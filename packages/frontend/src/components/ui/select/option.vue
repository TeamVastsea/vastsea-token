<script lang="ts" setup generic="T extends AcceptableValue">
import type { AcceptableValue, ComboboxItemProps } from 'reka-ui';
import type { OptionProps } from './select.options';
import { ComboboxItem } from 'reka-ui';
import { toRefs, unref } from 'vue';
import { useContext } from './select.options';

type FinalOptionProps = ComboboxItemProps & OptionProps<T>;

const props = defineProps<FinalOptionProps>();
const { label, value } = toRefs(props);

const { renderOptions } = useContext()!;
renderOptions.value.push({ label: unref(label), value: unref(value) });
</script>

<template>
  <combobox-item :value="value" class="group">
    <div class="p-2">
      <div
        class="px-2 py-1 rounded cursor-pointer transition
        hover:bg-blue-500/30 hover:text-blue-900 dark:hover:text-blue-100 dark:text-zinc-200
        group-data-[state='checked']:bg-blue-500/30 group-data-[state='checked']:bg-blue-500/30
        dark:group-data-[state='checked']:text-blue-100
        "
      >
        {{ label }}
      </div>
    </div>
  </combobox-item>
</template>
