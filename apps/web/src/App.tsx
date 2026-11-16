import React, { useEffect } from 'react';
import { socket } from './socket';
import { useStore } from './store';
import { HomeScreen } from './components/HomeScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { TableScreen } from './components/TableScreen';
import { GameOverModal } from './components/GameOverModal';
import { RulesModal } from './components/RulesModal';
import { HistoryModal } from './components/HistoryModal';
import { ChatDrawer } from './components/ChatDrawer';
import { ToastContainer } from './components/ToastContainer';
import type { ChatMessage, GameOverData, GameEvent, PublicGameState, RoomState } from './types';

export const App: React.FC = () => {
  const {
    roomCode,
    playerToken,
    playerName,
    roomState,
    setSession,
    clearSession,
    setRoomState,
    setGameState,
    setGameOver,
    showRules,
    setShowRules,
    addChatMessage,
    setChatHistory,
    addToast,
    errorMessage,
    setError,
  } = useStore();

  useEffect(() => {
    socket.connect();

    // Auto-reconnect if token exists
    if (roomCode && playerToken) {
      socket.emit(
        'room:join',
        { code: roomCode, token: playerToken, name: playerName },
        (res: any) => {
          if (res && res.ok) {
            setSession(res.code, res.token, res.seat);
          } else {
            clearSession();
          }
        }
      );
    }

    const onRoomState = (state: RoomState) => {
      setRoomState(state);
      if (state.status === 'playing') {
        setGameOver(null);
      }
    };

    const onGameState = (payload: {
      gameState: PublicGameState;
      legalCardIds: string[];
      events: GameEvent[];
      turnDeadline?: number;
    }) => {
      setGameState(
        payload.gameState,
        payload.legalCardIds,
        payload.events,
        payload.turnDeadline
      );
    };

    const onGameOver = (data: GameOverData) => {
      setGameOver(data);
    };

    const onError = (err: { message: string }) => {
      setError(err.message);
      addToast(`⚠️ ${err.message}`, 'info');
    };

    const onDisconnect = () => {
      addToast('Disconnected from server. Reconnecting...', 'info');
    };

    const onChatMessage = (msg: ChatMessage) => {
      addChatMessage(msg);
    };

    const onChatHistory = (payload: { messages: ChatMessage[] }) => {
      setChatHistory(payload.messages || []);
    };

    socket.on('room:state', onRoomState);
    socket.on('game:state', onGameState);
    socket.on('game:over', onGameOver);
    socket.on('chat:message', onChatMessage);
    socket.on('chat:history', onChatHistory);
    socket.on('error', onError);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('room:state', onRoomState);
      socket.off('game:state', onGameState);
      socket.off('game:over', onGameOver);
      socket.off('chat:message', onChatMessage);
      socket.off('chat:history', onChatHistory);
      socket.off('error', onError);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <div className="app-container">
      {errorMessage && (
        <div className="global-error-banner" onClick={() => setError(null)}>
          <span>{errorMessage}</span>
          <button className="error-close">✕</button>
        </div>
      )}

      {!roomState && <HomeScreen />}
      {roomState && roomState.status === 'waiting' && <LobbyScreen />}
      {roomState && (roomState.status === 'playing' || roomState.status === 'finished') && (
        <TableScreen />
      )}

      <GameOverModal />
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      <HistoryModal />
      <ChatDrawer />
      <ToastContainer />
    </div>
  );
};

export default App;
