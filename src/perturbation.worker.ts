import { referenceOrbit, type ReferenceRequest } from './perturbation-reference';
const scope = self as unknown as { postMessage(data: unknown, transfer?: Transferable[]): void };
self.onmessage = ({ data }: MessageEvent<ReferenceRequest>) => {
  try { const result = referenceOrbit(data); scope.postMessage({ type: 'reference', ...result }, [result.data.buffer]); }
  catch (error) { scope.postMessage({ type: 'error', id: data.id, message: String(error) }); }
};
