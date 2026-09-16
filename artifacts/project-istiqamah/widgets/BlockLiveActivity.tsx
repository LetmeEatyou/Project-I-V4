import { HStack, Image, Link, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  activityBackgroundTint,
  font,
  foregroundStyle,
  lineLimit,
  monospacedDigit,
  padding,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import {
  createLiveActivity,
  type LiveActivityEnvironment,
  type LiveActivityLayout,
} from "expo-widgets";

export type BlockLiveActivityProps = {
  taskId: string;
  taskName: string;
  timeLabel: string;
  startTimestamp: number;
  endTimestamp: number;
  deepLink: string;
};

function BlockLiveActivity(
  props: BlockLiveActivityProps,
  environment: LiveActivityEnvironment,
): LiveActivityLayout {
  "widget";

  const start = new Date(props.startTimestamp);
  const end = new Date(props.endTimestamp);
  const foreground = environment.isLuminanceReduced ? "#D1D1D1" : "#FFFFFF";
  const secondary = environment.isLuminanceReduced ? "#8A8A8A" : "#A7A7A7";
  const accent = environment.isLuminanceReduced ? "#FFFFFF" : "#8EA8FF";
  const status = environment.isStale
    ? "BLOCK ENDED · TAP TO RECORD"
    : "BLOCK RUNNING";

  return {
    banner: (
      <HStack
        spacing={12}
        modifiers={[
          padding({ all: 16 }),
          activityBackgroundTint("#111111"),
          widgetURL(props.deepLink),
        ]}
      >
        <VStack alignment="leading" spacing={5}>
          <Text
            modifiers={[
              font({ size: 11, weight: "bold" }),
              foregroundStyle(accent),
            ]}
          >
            {status}
          </Text>
          <Text
            modifiers={[
              font({ size: 18, weight: "semibold" }),
              foregroundStyle(foreground),
              lineLimit(1),
            ]}
          >
            {props.taskName}
          </Text>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(secondary)]}>
            {props.timeLabel}
          </Text>
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={5}>
          <Text
            timerInterval={{ lower: start, upper: end }}
            countsDown
            pauseTime={end}
            modifiers={[
              font({ size: 20, weight: "semibold", design: "monospaced" }),
              monospacedDigit(),
              foregroundStyle(foreground),
            ]}
          />
          <Text
            modifiers={[
              font({ size: 10, weight: "medium" }),
              foregroundStyle(secondary),
            ]}
          >
            Tap to record
          </Text>
        </VStack>
      </HStack>
    ),
    compactLeading: <Image systemName="timer" color={accent} size={15} />,
    compactTrailing: (
      <Text
        timerInterval={{ lower: start, upper: end }}
        countsDown
        pauseTime={end}
        modifiers={[
          font({ size: 13, weight: "semibold", design: "monospaced" }),
          monospacedDigit(),
          foregroundStyle(foreground),
        ]}
      />
    ),
    minimal: <Image systemName="timer" color={accent} size={14} />,
    expandedLeading: (
      <VStack alignment="leading" spacing={4} modifiers={[padding({ all: 8 })]}>
        <Image systemName="timer" color={accent} size={19} />
        <Text
          modifiers={[
            font({ size: 10, weight: "bold" }),
            foregroundStyle(accent),
          ]}
        >
          LIVE
        </Text>
      </VStack>
    ),
    expandedCenter: (
      <VStack
        alignment="leading"
        spacing={4}
        modifiers={[padding({ vertical: 8 })]}
      >
        <Text
          modifiers={[
            font({ size: 15, weight: "semibold" }),
            foregroundStyle(foreground),
            lineLimit(1),
          ]}
        >
          {props.taskName}
        </Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(secondary)]}>
          {props.timeLabel}
        </Text>
      </VStack>
    ),
    expandedTrailing: (
      <Text
        timerInterval={{ lower: start, upper: end }}
        countsDown
        pauseTime={end}
        modifiers={[
          padding({ all: 8 }),
          font({ size: 14, weight: "semibold", design: "monospaced" }),
          monospacedDigit(),
          foregroundStyle(foreground),
        ]}
      />
    ),
    expandedBottom: (
      <HStack spacing={8} modifiers={[padding({ horizontal: 8, bottom: 8 })]}>
        <Text
          modifiers={[
            font({ size: 11, weight: "medium" }),
            foregroundStyle(secondary),
          ]}
        >
          Finished your block?
        </Text>
        <Spacer />
        <Link
          label="Record complete"
          destination={props.deepLink}
          modifiers={[
            font({ size: 11, weight: "semibold" }),
            foregroundStyle(accent),
          ]}
        />
      </HStack>
    ),
  };
}

export default createLiveActivity<BlockLiveActivityProps>(
  "BlockLiveActivity",
  BlockLiveActivity,
);
