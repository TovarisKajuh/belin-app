import { notFound } from "next/navigation";

// Any path under a locale that matches no route. Without this Next falls back
// to its own white English 404, outside our layout and our language.
export default function UnknownPath() {
  notFound();
}
