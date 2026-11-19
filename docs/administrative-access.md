# Shared Administrative Access

This is the standing access requirement for every repository, landing page, site, platform service, shared tool, and external resource owned or operated by this project. It applies to existing resources and every new resource before setup is considered complete.

## Required Operators

The verified GitHub accounts `LynxPardelle` and `Toydrum` must both have active administrative control. Use each operator's individual account on GitHub and on every other provider. A GitHub account does not establish the corresponding identity on AWS, a site administrator, or another service; verify that mapping before granting access.

Both operators must be able to maintain the resource, manage its configuration and access, and perform the operational tasks supported by the service. Preserve required reviews, protected branches, environment restrictions, MFA, and deployment authorization. Administrative access does not waive those controls or authorize unrelated production changes.

## GitHub Ownership Requirement

New project repositories must be owned by a verified project organization in which both required accounts are active owners. Organization owners inherit administrative access to all organization repositories, including repositories created later. Verify each membership and each repository's effective permission after provisioning.

For a new registered draft, record the verified organization as its entry-level `owner` and use the matching clone URL. Preserve existing entries and the registry's legacy default until their individual migrations are reviewed; changing the default alone would misidentify existing personal repositories and their deployment trust.

GitHub personal repositories have one owner. Their collaborators have write access; the collaborator API's `permission` parameter applies only to organization repositories. Consequently, a personal repository with one required operator as owner and the other as a writer does **not** satisfy this policy. Record that ownership limitation until an approved organization migration is completed.

References: [personal repository permissions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/permission-levels-for-a-personal-account-repository), [organization repository roles](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization), and [collaborator API](https://docs.github.com/en/rest/collaborators/collaborators#add-a-repository-collaborator).

## Provisioning And Acceptance

1. Establish resource ownership and the provider identities corresponding to both operators. Include every allowed environment and any separate administrator, content, billing, DNS, analytics, package, and deployment surface that the resource requires.
2. Grant both operators the provider's owner or administrator role. Use individual memberships or verified administrative groups; do not share credentials or copy secret values into repositories, reports, or invitations.
3. Read back effective permissions for both identities. A pending invitation, a write/maintain role, a repository's public visibility, and access through the creator's browser session do not prove administrative access.
4. Verify usable access in the intended account. Where an operator must accept an invitation or sign in, retain that pending status until acceptance and the intended account's access are confirmed. Do not impersonate the other operator or accept an invitation on their behalf.
5. Record a sanitized result in the owning repository's changelog. Setup is incomplete while either operator's required access is missing, pending, unverifiable, or restricted by personal ownership. For a service whose ownership model prevents two administrators, record the concrete limitation and resolve ownership before claiming completion.
6. Repeat the check after creating, transferring, restoring, or changing ownership of a repository or service. Cross-check the [repository map](./repository-map.md), [draft registry](./drafts-registry.json), live GitHub inventory, and the owning service's resource inventory. A registry alone may omit recent or inaccessible resources.

Existing bootstrap, GitHub setup, fleet knowledge, and release checks do **not** audit or enforce this shared-access requirement automatically. Their successful exit status is not evidence of shared administrative access. Operators must perform and record the separate acceptance check; do not describe this policy document as an installed automation.

## Organization Migration Review

Prepare the following before transferring any existing repository:

- The exact target organization, its plan and private-repository protection capabilities, and active owner memberships for both required accounts.
- A per-repository ownership inventory, effective access, pending invitations, branch protections, environments, installed GitHub Apps, reusable workflow access, package/container ownership, and rollback procedure.
- The owning infrastructure repository's reviewed changes for OIDC trust. Read the actual current and destination repository identities and subject prefixes; an owner transfer can invalidate the trusted subject, including immutable owner/repository prefixes. Preserve exact repository, environment, and branch restrictions.
- Changes to owner overrides, clone URLs, workflow references, package references, and canonical links in each owning registry or repository. Redirects alone do not repair IAM trust or workflow authorization.
- A pilot transfer with deployment and rollback verification under that repository's own release rules before expanding the migration.

An organization transfer is a separate ownership and deployment change. Access remediation on existing repositories must not silently transfer them, weaken IAM trust, or change production release gates.

## Other Providers And Site Administrators

AWS administrative access must use verified individual IAM or IAM Identity Center principals with effective permissions checked in the intended account. Do not create shared access keys to implement this policy.

Application access is separate from cloud and repository access. Check the owning authentication service's actual user-pool, group, role, draft scope, and environment contracts. Grant existing verified operator identities through supported administration; do not infer a site's account from a matching name, create credentials, or publish user attributes.

For domain registrars, hosting/email providers, DNS outside the managed cloud account, payments, analytics, search consoles, and other SaaS products, verify each required operator's provider role separately. Record a service as unverified when the current session cannot inspect it. Existing provider activation and customer-ownership boundaries remain applicable.
