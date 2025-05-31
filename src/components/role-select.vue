<script lang="ts" setup>
import { useRole } from '@/composables';
import { TinyOption, TinySelect } from '@opentiny/vue';
import { vElementVisibility } from '@vueuse/components';
import { computed, onMounted } from 'vue';

defineProps<{ clientId?: string }>();
const modelValue = defineModel<string[]>();
const { loadMore, getRoleList, roleList } = useRole({ type: 'scroll' });

const roleOptions = computed(() => {
  return roleList.value.map((role) => {
    return {
      label: role.name,
      value: role.id,
    };
  });
});

onMounted(() => {
  getRoleList();
});
</script>

<template>
  <tiny-select v-model="modelValue">
    <tiny-option v-for="opt in roleOptions" :key="opt.value" :value="opt.value" :label="opt.label" />
    <div v-element-visibility="() => loadMore()" />
  </tiny-select>
</template>
