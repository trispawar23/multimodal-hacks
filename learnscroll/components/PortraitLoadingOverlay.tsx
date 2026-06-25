import { LoadingState } from "./ui/LoadingState";

interface PortraitLoadingOverlayProps {
  characterName?: string;
  message?: string;
}

export function PortraitLoadingOverlay({
  characterName,
  message,
}: PortraitLoadingOverlayProps) {
  return (
    <div className="absolute inset-0 z-[5] flex items-center justify-center">
      <LoadingState
        message={
          message ??
          (characterName
            ? `Loading ${characterName}…`
            : "Loading portrait…")
        }
      />
    </div>
  );
}
