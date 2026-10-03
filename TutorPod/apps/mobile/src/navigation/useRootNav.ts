import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";

/** Reach root stack actions (Login, Player, …) from tab screens. */
export function useRootNav() {
  const nav = useNavigation();
  const parent = nav.getParent() as
    | NativeStackNavigationProp<RootStackParamList>
    | undefined;
  return (parent ?? nav) as NativeStackNavigationProp<RootStackParamList>;
}
