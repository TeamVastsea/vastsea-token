import type { CommonComposablesProps } from '@/types/common-composables';
import type { MininalAccount } from './useAccountList';
import { ref } from 'vue';
import instance from './axios';

export function useInfiniteAccountList(
  { fetcher }: CommonComposablesProps = { fetcher: instance },
) {
  const preId = ref<bigint | undefined>(undefined);
  const data = ref<MininalAccount[]>([]);
  const total = ref<string>('-1');
  const isLoading = ref(true);
  const canLoad = ref(false);

  const load = () => {
    isLoading.value = true;
    return fetcher
      .get<never, List<MininalAccount>>('/account', {
        params: {
          preId: preId.value,
          size: 20,
        },
      })
      .then((resp) => {
        const newData = resp.data.filter(account =>
          data.value.every(
            data => data.id.toString() !== account.id.toString(),
          ),
        );
        data.value.push(...newData);
        total.value = resp.total.toString();
        canLoad.value = data.value.length < Number.parseInt(total.value);
      })
      .finally(() => {
        isLoading.value = false;
      });
  };

  const loadMore = () => {
    if (
      isLoading.value || !canLoad.value
    ) {
      return;
    }
    preId.value = BigInt(data.value[data.value.length - 1].id);
    load();
  };
  return { loadMore, load, isLoading, total, data };
}
