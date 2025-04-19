import type { CommonComposablesProps } from '@/types/common-composables';
import type { Ref } from 'vue';
import type { Client } from './useClient';
import SuperJSON from 'superjson';
import { ref } from 'vue';
import instance from './axios';

export interface ClientManagerProfile {
  id: string;
  desc: string | null;
  avatar: string | null;
  nick: string;
  accountId: bigint;
}

export interface ClientInfo extends Client {
  administrator: ClientManagerProfile[];
}
export interface UseClientListProps {
  size: number;
  type?: 'scroll' | 'page';
}
export function useClientList(
  { fetcher: _fecther, size: _size, type }: Partial<CommonComposablesProps> & UseClientListProps = {
    fetcher: instance,
    size: 20,
    type: 'page',
  },
) {
  const fetcher = _fecther ?? instance;
  const loading = ref(false);
  const data: Ref<ClientInfo[]> = ref([]);
  const preId: Ref<undefined | string> = ref(undefined);
  const size: Ref<number> = ref(_size);
  const total = ref(0);
  const curPage = ref(1);
  const canLoad = ref(false);

  // page -> preId
  const preIdRecord = new Map<number, string>();
  const getList = () => {
    loading.value = true;
    return fetcher.get<unknown, List<ClientInfo>>('/client', {
      params: SuperJSON.serialize({
        preId: preId.value,
        size: size.value,
      }).json,
    })
      .then((resp) => {
        if (type === 'page') {
          data.value = resp.data;
        }
        if (type === 'scroll') {
          data.value.push(...resp.data);
        }
        total.value = Number.parseInt(resp.total.toString());
        canLoad.value = data.value.length < total.value;
        return resp;
      })
      .finally(() => {
        loading.value = false;
      });
  };
  const loadNext = (page: number) => {
    preId.value = data.value[data.value.length - 1].id;
    preIdRecord.set(page, preId.value);
    return getList();
  };
  const loadPrev = (page: number) => {
    preId.value = preIdRecord.get(page);
    return getList();
  };
  const loadMore = () => {
    if (!canLoad.value) {
      return;
    }
    curPage.value += 1;
    loadNext(curPage.value);
  };
  const setSize = (newSize: number) => {
    size.value = newSize;
    preId.value = undefined;
    data.value = [];
    preIdRecord.clear();
    return getList();
  };
  return { getList, loadNext, loadPrev, setSize, loadMore, canLoad, loading, data, total, size };
}
