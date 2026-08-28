import { describe, expect, it } from "vitest";
import { universalHardwareControls } from "./hardwareAvailability";

describe("controles universais de hardware", () => {
  it("mantém gaveta e balança bloqueadas até a configuração do equipamento", () => {
    expect(universalHardwareControls.drawer).toMatchObject({ available: false, label: "Abrir gaveta indisponível" });
    expect(universalHardwareControls.scale).toMatchObject({ available: false, label: "Ler peso da balança indisponível" });
  });
});
