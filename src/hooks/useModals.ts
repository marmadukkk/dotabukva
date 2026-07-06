import { useState, useCallback } from 'react';

interface ConfirmModalState {
  show: boolean;
  title: string;
  message: string;
  onConfirm?: () => void;
}

export function useModals() {
  const [showHowto, setShowHowto] = useState(false);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({ show: false, title: '', message: '' });
  const [showRoomListModal, setShowRoomListModal] = useState(false);
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [joinCodeInput, setJoinCodeInput] = useState('');

  const showConfirm = useCallback((message: string, title: string, onYes?: () => void) => {
    setConfirmModal({ show: true, title, message, onConfirm: onYes });
  }, []);

  const hideConfirm = useCallback((confirmed: boolean) => {
    const cb = confirmModal.onConfirm;
    setConfirmModal({ show: false, title: '', message: '' });
    if (confirmed && cb) cb();
  }, [confirmModal.onConfirm]);

  const showHostingDonation = useCallback((t: (key: string) => string) => {
    setConfirmModal({
      show: true,
      title: t('modal.donationTitle'),
      message: t('modal.donationMsg'),
      onConfirm: () => setConfirmModal({show:false, title:'', message:''})
    });
  }, []);

  const showRoomInvite = useCallback((code: string, t: (key: string) => string) => {
    const link = `${window.location.origin}/?room=${code}`;
    setConfirmModal({
      show: true,
      title: t('modal.roomCreated'),
      message: `${t('modal.roomCode')} ${code}\n\n${link}`,
      onConfirm: () => { navigator.clipboard?.writeText(link); setConfirmModal({show:false,title:'',message:''}); }
    });
  }, []);

  const closeRoomListModal = useCallback(() => {
    setShowRoomListModal(false);
    setJoinCodeInput('');
  }, []);

  return {
    showHowto,
    setShowHowto,
    confirmModal,
    setConfirmModal,
    showRoomListModal,
    setShowRoomListModal,
    roomsList,
    setRoomsList,
    joinCodeInput,
    setJoinCodeInput,
    showConfirm,
    hideConfirm,
    showHostingDonation,
    showRoomInvite,
    closeRoomListModal,
  };
}
