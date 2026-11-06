// Platform affects wording only. It never establishes a keyboard layout.
export function keyboardLabels(navigator) {
  const platform =
    navigator.userAgentData?.platform || navigator.platform || "";
  const mac = /mac/i.test(platform);
  return {
    mac,
    alt: mac ? "Option" : "Alt",
    back: mac ? "Delete" : "Backspace",
    format(binding) {
      return binding
        .split("+")
        .map((key) => {
          const value = key.trim();
          return (
            {
              alt: mac ? "Option" : "Alt",
              opt: mac ? "Option" : "Alt",
              option: mac ? "Option" : "Alt",
              ctrl: "Ctrl",
              control: "Ctrl",
              meta: mac ? "Command" : "Meta",
              cmd: mac ? "Command" : "Meta",
              command: mac ? "Command" : "Meta",
            }[value.toLowerCase()] || value
          );
        })
        .join(" + ");
    },
  };
}
