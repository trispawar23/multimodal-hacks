import { LoadingState } from "./ui/LoadingState";

interface PortraitLoadingOverlayProps {
  characterName?: string;
}

export function PortraitLoadingOverlay({
  characterName,
}: PortraitLoadingOverlayProps) {
  return (
    <div className="absolute inset-0 z-[5] flex items-center justify-center">
      <LoadingState
        message={
          characterName
            ? `Generating ${characterName}…`
            : "Generating teacher & portrait…"
        }
      />
    </div>
  );
}
