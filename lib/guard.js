import { getSession } from "./session";

/**
 * Dipakai di getServerSideProps halaman yang wajib login.
 *
 *   export const getServerSideProps = withPage({ admin: true });
 */
export function withPage({ admin = false, allowWajibGanti = false } = {}) {
  return async (ctx) => {
    const session = await getSession(ctx.req);
    if (!session) {
      return { redirect: { destination: `/login?next=${encodeURIComponent(ctx.resolvedUrl)}`, permanent: false } };
    }
    if (session.wajibGantiPassword && !allowWajibGanti) {
      return { redirect: { destination: "/ganti-password", permanent: false } };
    }
    if (admin && !session.admin) {
      return { redirect: { destination: "/", permanent: false } };
    }
    const { sid, ...pub } = session;
    return { props: { session: pub } };
  };
}
