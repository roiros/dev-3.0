Fix setup script exiting with code 1 after successful completion. The `read -t 15` command returns 1 on timeout, and the bare `exit` inherited that code. Now explicitly exits with 0.
