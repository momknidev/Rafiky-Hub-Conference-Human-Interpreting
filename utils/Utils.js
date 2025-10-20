export class Utils {
    static floatTo16BitPCM(float32Array) {
      const buffer = new ArrayBuffer(float32Array.length * 2);
      const view = new DataView(buffer);
      let offset = 0;
      for (let i = 0; i < float32Array.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      }
      return buffer;
    }

    static base64ToArrayBuffer(base64) {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    }
    static arrayBufferToBase64(arrayBuffer) {
      if (arrayBuffer instanceof Float32Array) {
        arrayBuffer = this.floatTo16BitPCM(arrayBuffer);
      } else if (arrayBuffer instanceof Int16Array) {
        arrayBuffer = new Int16Array(arrayBuffer).buffer;
      }
      let binary = "";
      let bytes = new Uint8Array(arrayBuffer);
      const chunkSize = 0x8000; // 32KB chunk size
      for (let i = 0; i < bytes.length; i += chunkSize) {
        let chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
      }
      return btoa(binary);
    }
    static mergeInt16Arrays(left, right) {
      if (left instanceof ArrayBuffer) {
        left = new Int16Array(left);
      }
      if (right instanceof ArrayBuffer) {
        right = new Int16Array(right);
      }
      if (!(left instanceof Int16Array) || !(right instanceof Int16Array)) {
        throw new Error(`Both items must be Int16Array`);
      }
      const newValues = new Int16Array(left.length + right.length);
      for (let i = 0; i < left.length; i++) {
        newValues[i] = left[i];
      }
      for (let j = 0; j < right.length; j++) {
        newValues[left.length + j] = right[j];
      }
      return newValues;
    }
    static generateId(prefix, length = 21) {
      // base58; non-repeating chars
      const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
      const str = Array(length - prefix.length)
        .fill(0)
        .map(() => chars[Math.floor(Math.random() * chars.length)])
        .join("");
      return `${prefix}${str}`;
    }
  }