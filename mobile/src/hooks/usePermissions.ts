import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { PERMISSIONS, RESULTS, request } from 'react-native-permissions';
import toast from 'react-hot-toast/native';

export const usePermissions = () => {
    const [micPermission, setMicPermission] = useState<string | null>(null);

    const checkMicPermission = useCallback(async () => {
        const permission = Platform.OS === 'ios' ? PERMISSIONS.IOS.MICROPHONE : PERMISSIONS.ANDROID.RECORD_AUDIO;
        const result = await request(permission);
        setMicPermission(result);

        if (result === RESULTS.BLOCKED) {
            toast.error("Microphone permission is blocked. Please enable it in your device settings.");
        } else if (result === RESULTS.DENIED) {
            toast("Microphone permission is required for voice translation.");
        }
        return result;
    }, []);


    useEffect(() => {
        // You could optionally check permissions on component mount
        // checkMicPermission();
    }, [checkMicPermission]);

    return { micPermission, checkMicPermission };
};