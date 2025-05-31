<script lang="ts" setup>
import { useInfiniteAccountList } from '@/composables';
import { TinyOption, TinySelect } from '@opentiny/vue';
import InfiniteScroll from '@opentiny/vue-renderless/common/deps/infinite-scroll';
import { vElementVisibility } from '@vueuse/components';
import { onMounted, ref, watch } from 'vue';

const { data, load, loadMore, isLoading } = useInfiniteAccountList();
const vInfiniteScroll = InfiniteScroll;
const modelValue = defineModel<string[]>();
const administratorId = ref<string[]>(modelValue.value ?? []);

watch(
  () => modelValue,
  () => {
    administratorId.value = modelValue.value ?? [];
  },
  { deep: true },
);

onMounted(() => {
  load();
});
</script>

<template>
  <tiny-select
    v-model="modelValue"
    v-infinite-scroll="loadMore"
    :loading="isLoading"
    multiple
  >
    <tiny-option
      v-for="option in data"
      :key="option.id"
      :value="option.id"
      :label="option.profile.nick"
    />
    <div v-element-visibility="loadMore" />
  </tiny-select>
</template>
