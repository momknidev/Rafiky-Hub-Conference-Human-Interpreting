import protobuf from "protobufjs";
import { useRef, useEffect } from "react";


export const usePrototype = () => {
    const protypeRef = useRef(null);

    useEffect(() => {
        const loadProto = async () => {
            const root = await protobuf.load("/public/protos/SttMessage.proto");
            protypeRef.current = root;
        };
        loadProto();
    }, []);

    return protypeRef;
}