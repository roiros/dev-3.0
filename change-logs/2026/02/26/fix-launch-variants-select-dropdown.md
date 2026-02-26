Fix Select dropdown in LaunchVariantsModal not responding to clicks.

The click-outside handler only checked the trigger button ref, so clicking an option in the portal-rendered dropdown triggered setOpen(false) on mousedown before the click event could fire. Added onMouseDown stopPropagation on the dropdown container to prevent this.
