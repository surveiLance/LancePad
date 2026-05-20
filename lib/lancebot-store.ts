type Listener = (content: string) => void;

let _content = "";
const _listeners = new Set<Listener>();

export function setNoteContent(content: string) {
  _content = content;
  _listeners.forEach((l) => l(content));
}

export function subscribeNoteContent(listener: Listener) {
  _listeners.add(listener);
  listener(_content);
  return () => _listeners.delete(listener);
}
