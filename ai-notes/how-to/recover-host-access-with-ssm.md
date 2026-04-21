# Recover Host Access With SSH And Systems Manager

Date: 2026-04-20 (Central Time)
Scope: Sanitized recovery procedure for restoring host access when SSH is unavailable.
Status: Active
Applies To: Active platform hosts where direct SSH is failing or insufficient
Source Of Truth:

- Sanitized from verified platform recovery work completed on 2026-04-04

Confidence: Medium
Last Reviewed: 2026-04-20 (Central Time)

## Purpose

Use this procedure when SSH is refusing connections, timing out, or otherwise blocking recovery work on an active host.

## Recommended Recovery Order

1. Recover access through any alternate shell path such as a serial console or existing management channel.
2. Restore the SSH service and confirm it is listening.
3. Verify that the Systems Manager agent is installed and running.
4. Verify that the instance role can talk to Systems Manager.
5. Confirm the host appears as a managed instance before you rely on it for recovery.

## Restore SSH First

Once you have an alternate shell path, verify:

- the SSH service exists and is running
- the daemon is listening on the expected port
- the host firewall is not blocking SSH
- the daemon configuration does not disable the intended auth method

If SSH still times out after the daemon is healthy, verify the network edge separately:

- security-group or firewall allowlists
- the current client IP
- any local key-permission issue on the workstation

## Enable Systems Manager

Confirm all of these are true:

- the Systems Manager agent is installed
- the agent is enabled on boot and currently running
- the host role includes the managed Systems Manager core permissions or an equivalent policy set
- outbound connectivity to the required Systems Manager endpoints is available

If the host sits in a private subnet, provide the required egress path through NAT or VPC endpoints.

## Verify Registration

Before declaring recovery complete:

1. confirm the host appears as an online managed instance
2. run a simple remote command such as `hostname` and `whoami`
3. confirm Systems Manager can still be used if SSH fails again later

## Harden After Recovery

- keep Systems Manager enabled on the active host
- keep SSH as a fallback, not the only access path
- restrict SSH exposure to controlled access when possible
- avoid depending on rapidly changing operator-IP allowlists as the sole recovery path

## Security Rule

Do not record instance IDs, role names, IP allowlists, PEM paths, or other volatile access specifics in committed notes. Keep committed guidance procedural and reusable.
