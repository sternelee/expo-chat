import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { Stack as NativeStack } from "expo-router";
import React from "react";

// These are the default stack options for iOS, they disable on other platforms.
const DEFAULT_STACK_HEADER: NativeStackNavigationOptions =
  process.env.EXPO_OS !== "ios"
    ? {}
    : {
      headerTransparent: true,
      headerBlurEffect: "systemChromeMaterial",
      headerShadowVisible: true,
      headerLargeTitleShadowVisible: false,
      headerLargeStyle: {
        backgroundColor: "transparent",
      },
      headerLargeTitle: false,
    };

/** Create a bottom sheet on iOS with extra snap points (`sheetAllowedDetents`) */
export const BOTTOM_SHEET: NativeStackNavigationOptions = {
  // https://github.com/software-mansion/react-native-screens/blob/main/native-stack/README.md#sheetalloweddetents
  presentation: "formSheet",
  gestureDirection: "vertical",
  animation: "slide_from_bottom",
  sheetGrabberVisible: true,
  sheetInitialDetentIndex: 0,
  sheetAllowedDetents: ["medium", "large"],
};

export default function Stack({
  screenOptions,
  children,
  ...props
}: any) {
  const processedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      const childProps = child.props as any;
      if (childProps.sheet) {
        const { sheet, ...restProps } = childProps;
        return React.cloneElement(child, {
          ...restProps,
          options: {
            ...BOTTOM_SHEET,
            ...restProps.options,
          },
        });
      }
    }
    return child;
  });

  return (
    <NativeStack
      screenOptions={{
        ...DEFAULT_STACK_HEADER,
        ...screenOptions,
      }}
      {...props}
      children={processedChildren}
    />
  );
}

Stack.Screen = NativeStack.Screen as any;
