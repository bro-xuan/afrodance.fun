import type { ComponentType } from "react";
import type { ProjectVisual } from "@/types";
import AnalogCameraVisual from "./AnalogCameraVisual";
import BtcCycleVisual from "./BtcCycleVisual";
import HouseBuildVisual from "./HouseBuildVisual";
import InstaClawDeployVisual from "./InstaClawDeployVisual";
import JargonDecoderVisual from "./JargonDecoderVisual";
import MarketIntelVisual from "./MarketIntelVisual";
import MigrationFlowVisual from "./MigrationFlowVisual";
import PhotoRelightVisual from "./PhotoRelightVisual";
import PortraitFrameVisual from "./PortraitFrameVisual";
import ReferenceCallVisual from "./ReferenceCallVisual";
import TeardownVisual from "./TeardownVisual";
import WhaleTrackerVisual from "./WhaleTrackerVisual";

/** Every animated pixel-art scene, by the name a project gives it in src/data/projects.ts. */
export const VISUALS: Record<ProjectVisual, ComponentType> = {
  "analog-camera": AnalogCameraVisual,
  "btc-cycle": BtcCycleVisual,
  "house-build": HouseBuildVisual,
  "instaclaw-deploy": InstaClawDeployVisual,
  "jargon-decoder": JargonDecoderVisual,
  "machine-teardown": TeardownVisual,
  "market-intel": MarketIntelVisual,
  "migration-flow": MigrationFlowVisual,
  "photo-relight": PhotoRelightVisual,
  "portrait-frame": PortraitFrameVisual,
  "reference-call": ReferenceCallVisual,
  "whale-tracker": WhaleTrackerVisual,
};
