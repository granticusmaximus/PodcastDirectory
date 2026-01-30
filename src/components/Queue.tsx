import React, { useState, useEffect, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { QueueItem } from '../types/podcast';
import './Queue.css';

interface QueueProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DragItem {
  id: number;
  index: number;
}

const QueueItemComponent: React.FC<{
  item: QueueItem;
  index: number;
  moveItem: (fromIndex: number, toIndex: number) => void;
  onRemove: (id: number) => void;
  onPlay: (item: QueueItem) => void;
}> = ({ item, index, moveItem, onRemove, onPlay }) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const [{ isDragging }, drag] = useDrag({
    type: 'QUEUE_ITEM',
    item: { id: item.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'QUEUE_ITEM',
    hover: (draggedItem: DragItem) => {
      if (draggedItem.index !== index) {
        moveItem(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  useEffect(() => {
    drag(drop(ref));
  }, [drag, drop]);

  return (
    <div
      ref={ref}
      className={`queue-item ${isDragging ? 'dragging' : ''}`}
    >
      <span className="drag-handle">⋮⋮</span>
      <div className="queue-item-info">
        <div className="queue-item-title">{item.episode?.title}</div>
        <div className="queue-item-meta">
          {item.episode?.duration && (
            <span>{Math.floor(item.episode.duration / 60)} min</span>
          )}
        </div>
      </div>
      <div className="queue-item-actions">
        <button onClick={() => onPlay(item)} className="btn-play-small">
          ▶
        </button>
        <button onClick={() => onRemove(item.id!)} className="btn-remove">
          ✕
        </button>
      </div>
    </div>
  );
};

const Queue: React.FC<QueueProps> = ({ isOpen, onClose }) => {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadQueue();
    }
  }, [isOpen]);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/queue/1'); // TODO: Use actual user ID
      const data = await response.json();
      setQueueItems(data);
    } catch (err) {
      console.error('Failed to load queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    const newItems = [...queueItems];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    
    // Update positions
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      position: index + 1
    }));
    
    setQueueItems(updatedItems);
    saveQueueOrder(updatedItems);
  };

  const saveQueueOrder = async (items: QueueItem[]) => {
    try {
      await fetch('http://localhost:3001/api/queue/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 1, // TODO: Use actual user ID
          items: items.map(item => ({ id: item.id, position: item.position }))
        })
      });
    } catch (err) {
      console.error('Failed to save queue order:', err);
    }
  };

  const handleRemove = async (itemId: number) => {
    try {
      await fetch(`http://localhost:3001/api/queue/${itemId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 1 }) // TODO: Use actual user ID
      });
      setQueueItems(queueItems.filter(item => item.id !== itemId));
    } catch (err) {
      console.error('Failed to remove from queue:', err);
    }
  };

  const handlePlay = (item: QueueItem) => {
    if (item.episode) {
      window.dispatchEvent(new CustomEvent('playEpisode', { detail: item.episode }));
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear the entire queue?')) {
      return;
    }

    try {
      await fetch('http://localhost:3001/api/queue/clear', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 1 }) // TODO: Use actual user ID
      });
      setQueueItems([]);
    } catch (err) {
      console.error('Failed to clear queue:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="queue-overlay" onClick={onClose}>
      <div className="queue-panel" onClick={(e) => e.stopPropagation()}>
        <div className="queue-header">
          <h2>Play Queue</h2>
          <div className="queue-header-actions">
            {queueItems.length > 0 && (
              <button onClick={handleClearAll} className="btn-clear">
                Clear All
              </button>
            )}
            <button onClick={onClose} className="btn-close">
              ✕
            </button>
          </div>
        </div>

        <div className="queue-content">
          {loading ? (
            <div className="queue-loading">Loading queue...</div>
          ) : queueItems.length === 0 ? (
            <div className="queue-empty">
              <p>Your queue is empty</p>
              <p className="queue-empty-subtitle">Add episodes to start listening</p>
            </div>
          ) : (
            <DndProvider backend={HTML5Backend}>
              <div className="queue-list">
                {queueItems.map((item, index) => (
                  <QueueItemComponent
                    key={item.id}
                    item={item}
                    index={index}
                    moveItem={moveItem}
                    onRemove={handleRemove}
                    onPlay={handlePlay}
                  />
                ))}
              </div>
            </DndProvider>
          )}
        </div>
      </div>
    </div>
  );
};

export default Queue;
