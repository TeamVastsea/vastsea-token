import type { CommonComposablesProps } from '@/types/common-composables';
import type { MaybeRef } from 'vue';
import type { Permission } from './usePermission';
import { ref, unref, watch } from 'vue';
import instance from './axios';

export interface RoleInfoItem {
  id: string;
  name: string;
  desc: string;
  clientId: string;
  clientPk: string;
  permission: Permission[];
  parents: Pick<MininalRole, 'id' | 'name' | 'clientId'>[];
  children: Pick<MininalRole, 'id' | 'name' | 'clientId'>[];
}

export interface CreateRole {
  clientId: string;
  parent: string[];
  desc: string;
  name: string;
  permissions: string[];
}

export interface MininalRole {
  clientId: string;
  id: string;
  name: string;
  desc: string;
  clientPK: string;
  active: boolean;
}

export interface UseRole {
  type: 'page' | 'scroll';
}

export function useRole(
  {
    fetcher: _fetcher,
    type: _type,
  }: Partial<CommonComposablesProps<UseRole>> = {
    fetcher: instance,
    type: 'page',
  },
) {
  const fetcher = _fetcher ?? instance;
  const type = _type ?? 'page';

  const curPage = ref(1);
  const roleList = ref<MininalRole[]>([]);
  const roleTotal = ref<string | null>(null);
  const roleListPageSize = ref(20);
  const preId = ref<string | undefined>();
  const pagePreid = new Map<number, string | undefined>();
  const clientId = ref<string | undefined>();

  const canLoad = ref(true);
  const loading = ref(false);

  const createRole = (data: MaybeRef<CreateRole>) => {
    return fetcher.post<never, MininalRole>('/role', unref(data));
  };
  const getRoleInfo = (roleId: string) => {
    return fetcher.get<unknown, RoleInfoItem>(`/role/${roleId}`);
  };
  const getRoleList = (
    { all, clientId }: { all?: boolean; clientId?: string } = {
      all: false,
      clientId: undefined,
    },
  ) => {
    loading.value = true;
    return fetcher
      .get<unknown, List<MininalRole>>(`/role`, {
        params: {
          preId: unref(preId),
          size: all ? undefined : unref(roleListPageSize),
          clientId,
        },
      })
      .then((resp) => {
        if (type === 'page') {
          roleList.value = resp.data;
        }
        if (type === 'scroll') {
          const newData = resp.data.filter((resp) => {
            return !roleList.value.map(role => role.id).includes(resp.id);
          });
          roleList.value.push(...newData);
        }
        roleTotal.value = resp.total.toString();
        canLoad.value = Boolean(resp.data.length);
      })
      .finally(() => {
        loading.value = false;
      });
  };
  const updateRole = (
    id: string,
    data: Partial<CreateRole & { active: boolean }>,
  ) => {
    return fetcher.patch<never, MininalRole>(`/role/${id}`, data);
  };
  const setPage = (page: number, type: 'next' | 'prev') => {
    curPage.value = page;
    if (type === 'next') {
      if (!roleList.value[roleList.value.length-1]) {
        return;
      }
      const id = roleList.value[roleList.value.length - 1].id;
      pagePreid.set(page, id);
      preId.value = id;
    }
    if (type === 'prev') {
      preId.value = pagePreid.get(curPage.value);
    }
  };
  const setSize = (newSize: number) => {
    if (type === 'page') {
      roleListPageSize.value = newSize;
    }
    pagePreid.clear();
    preId.value = undefined;
  };
  const setClientId = (target?: string) => {
    clientId.value = target;
  };
  const loadMore = (clientId?: string) => {
    if (loading.value || !canLoad.value) {
      return;
    }
    setClientId(clientId);
    setPage(curPage.value + 1, 'next');
  };
  watch(
    [preId, roleListPageSize, curPage, clientId],
    () => {
      getRoleList({ clientId: unref(clientId) });
    },
    { deep: true },
  );
  return {
    roleList,
    roleTotal,
    fetcher,
    preId,
    roleListPageSize,
    curPage,
    clientId,
    setPage,
    createRole,
    getRoleList,
    setSize,
    setClientId,
    getRoleInfo,
    updateRole,
    loadMore,
  };
}
