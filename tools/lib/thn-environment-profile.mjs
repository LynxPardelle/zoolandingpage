/** Closed deployment identities. Requests and draft payloads cannot choose these hosts. */
const profiles = Object.freeze({
  test: Object.freeze({ environment: 'test', adminHost: 'admin-test.thehairnarrative.com', publicHost: 'test.zoolandingpage.com.mx', serviceBindingId: 'thn-journal-test-v2' }),
  production: Object.freeze({ environment: 'production', adminHost: 'admin.thehairnarrative.com', publicHost: 'thehairnarrative.com', serviceBindingId: 'thn-journal-production-v2' }),
});
export function thnEnvironmentProfile(environment) {
  if (!Object.hasOwn(profiles, environment)) throw new Error('THN deployment environment profile rejected');
  return profiles[environment];
}
