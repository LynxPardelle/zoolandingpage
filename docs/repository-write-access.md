# Shared GitHub Write Access

The GitHub accounts `LynxPardelle` and `Toydrum` must both have active write access to every repository belonging to this project, including landing pages, sites, platform services, shared tools, and related product repositories. Apply this requirement to existing repositories and every new repository before setup or handoff is considered complete.

## Ownership And Permissions

Keep repositories under their existing personal owners. New repositories may belong to either required account; add the other account as a collaborator with write access. Preserve any existing owner, administrator, or higher permissions that already include writing. The acceptance criterion is effective `push: true` for both required accounts.

For registered drafts, record the actual GitHub owner and matching clone URL in the [draft registry](./drafts-registry.json). Use an entry-level `owner` when it differs from the registry default. Do not change repository ownership, registry defaults, or OIDC trust to implement this write-access requirement.

Keep required reviews, protected branches, environment restrictions, MFA, and deployment authorization. Write access does not waive those controls or authorize unrelated production changes.

## Creation And Verification

1. Identify the repository's actual owner and verify the effective permissions of both required accounts. Cross-check the [repository map](./repository-map.md), draft registry, and live GitHub inventory so recent or inaccessible repositories are included.
2. From the owner's authorized account, add whichever required account lacks write access. Preserve existing grants. If the current account cannot manage collaborators, record the exact repository and the owner action needed.
3. Read back effective access for both accounts. Owner or higher roles satisfy the requirement when they include `push: true`. Public visibility, read access, and a pending invitation do not satisfy it.
4. Keep invitations marked pending until acceptance and effective write permission are confirmed. Do not accept an invitation on another person's behalf or describe an invitation as active access.
5. Record a sanitized result in the owning repository's changelog. Setup or handoff remains incomplete while either required account lacks verified active write access. Never record credentials, tokens, raw provider responses, or private account details.
6. Repeat this check whenever a project repository is created, restored, or has its access or ownership changed. Treat adding the other required account as a mandatory part of creating any new project repository.

Existing bootstrap, GitHub setup, fleet knowledge, and release checks do **not** automatically audit or enforce this requirement. Their successful exit status is not evidence that both accounts can write. The operator performing setup must complete the separate permission readback and record outstanding invitations or owner actions.

## Deferred Site Panels

Website administrator panels and their authentication accounts remain unchanged. Their permissions are deferred to a separate review; they are not a prerequisite or an action in this repository write-access task.

References: [personal repository permissions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/permission-levels-for-a-personal-account-repository) and [collaborator API](https://docs.github.com/en/rest/collaborators/collaborators#add-a-repository-collaborator).
