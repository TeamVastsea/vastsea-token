<script lang="ts" setup>
import { Select as UiSelect } from '@/components/ui/select';
import { useClientList } from '@/composables';
import { noop } from '@vueuse/core';
import { computed, onMounted, ref } from 'vue';

const values = ref([]);

const { canLoad, loadMore, data, getList, loading } = useClientList({ type: 'scroll', size: 5 });
const selectOptions = computed(() => {
  return data.value.map((data) => {
    return {
      label: data.name,
      value: { clientId: data.clientId, name: data.name },
    };
  });
});

onMounted(() => {
  getList();
});
</script>

<template>
  <ui-select
    v-model="values"
    multiple
    :options="selectOptions"
    :display-behavior="(val) => val.name"
    @scroll-bottom="canLoad && !loading ? loadMore() : noop()"
  />
</template>
