"use client";

import { CardData } from "@/app/lib/db";
import { useState } from "react";
import Image from "next/image";

interface ObjectsPanelProps {
  cards: CardData[];
  onCardSelect?: (index: number) => void;
  onUpdateCard?: (id: string, key: keyof CardData, value: string) => void;
}

export default function ObjectsPanel({ cards, onCardSelect, onUpdateCard }: ObjectsPanelProps) {
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [expandedImages, setExpandedImages] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editingField, setEditingField] = useState<{id: string, field: keyof CardData} | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleImageExpand = (id: string) => {
    setExpandedImages((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const startEditingName = (card: CardData, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(card.id);
    setEditValue(card.name || `Card ${cards.findIndex(c => c.id === card.id) + 1}`);
  };

  const saveName = (id: string) => {
    if (onUpdateCard) {
      onUpdateCard(id, "name", editValue);
    }
    setEditingId(null);
  };

  const startEditingField = (card: CardData, field: keyof CardData, currentValue: string) => {
    setEditingField({ id: card.id, field });
    setEditValue(currentValue);
  };

  const saveField = () => {
    if (editingField && onUpdateCard) {
      onUpdateCard(editingField.id, editingField.field, editValue);
    }
    setEditingField(null);
  };

  const handleScrollToCard = (index: number) => {
    if (onCardSelect) {
      onCardSelect(index);
    } else {
      const element = document.querySelector(`[data-index="${index}"]`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">
          Objects
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {cards.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p>No objects found</p>
          </div>
        ) : (
          <div className="space-y-0 border border-gray-300">
            {cards.map((card, index) => {
              const isExpanded = expandedCards[card.id] ?? false; // Default collapsed
              const isImageExpanded = expandedImages[card.id] ?? false; // Default collapsed

              return (
                <div
                  key={card.id}
                  className="border-b border-gray-300 bg-white"
                >
                  {/* Card Header (Parent) */}
                  <div
                    className="flex items-center px-2 py-1 bg-gray-100 hover:bg-gray-200 cursor-pointer select-none border-b border-gray-300"
                    onClick={() => toggleExpand(card.id)}
                  >
                    <div className="mr-2 text-gray-500">
                      {isExpanded ? (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 mr-2">
                      {editingId === card.id ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => saveName(card.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveName(card.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="w-full text-sm border border-blue-500 rounded px-1 py-0.5 focus:outline-none"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span
                          className="font-medium text-sm text-gray-700 block truncate"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(card.id);
                            handleScrollToCard(index);
                          }}
                          onDoubleClick={(e) => startEditingName(card, e)}
                          title="Double click to rename"
                        >
                          {card.name || `Card ${index + 1}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Content (Children) */}
                  {isExpanded && (
                    <div className="bg-white py-1">
                      {/* Image Object (Parent for Media Info) */}
                      <div 
                        className="flex items-center px-4 py-1 hover:bg-blue-100 cursor-pointer group border-b border-gray-100 border-l-2 border-l-transparent hover:border-l-blue-500"
                        onClick={() => toggleImageExpand(card.id)}
                      >
                        <div className="mr-2 text-gray-500">
                          {isImageExpanded ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </div>
                        <div className="w-6 flex justify-center mr-2 text-blue-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-700 truncate">Image</p>
                          <div className="h-8 w-8 relative mt-0.5 border border-gray-300 bg-gray-50">
                             <Image 
                                src={card.imgSrc} 
                                alt="Thumbnail" 
                                fill 
                                className="object-cover"
                                sizes="32px"
                             />
                          </div>
                        </div>
                      </div>

                      {/* Text Objects (Nested under Image) */}
                      {isImageExpanded && (
                        <div className="pl-6 border-l border-gray-100 ml-4">
                          {/* Jenis */}
                          <EditableObjectItem 
                            label="Jenis" 
                            value={card.jenis} 
                            icon="T" 
                            isEditing={editingField?.id === card.id && editingField?.field === "jenis"}
                            editValue={editValue}
                            onEditStart={() => startEditingField(card, "jenis", card.jenis)}
                            onEditChange={setEditValue}
                            onEditSave={saveField}
                            onEditCancel={() => setEditingField(null)}
                          />
                          {/* Ukuran */}
                          <EditableObjectItem 
                            label="Ukuran" 
                            value={card.ukuran} 
                            icon="T" 
                            isEditing={editingField?.id === card.id && editingField?.field === "ukuran"}
                            editValue={editValue}
                            onEditStart={() => startEditingField(card, "ukuran", card.ukuran)}
                            onEditChange={setEditValue}
                            onEditSave={saveField}
                            onEditCancel={() => setEditingField(null)}
                          />
                          {/* Lokasi */}
                          <EditableObjectItem 
                            label="Lokasi" 
                            value={card.lokasi} 
                            icon="T" 
                            isEditing={editingField?.id === card.id && editingField?.field === "lokasi"}
                            editValue={editValue}
                            onEditStart={() => startEditingField(card, "lokasi", card.lokasi)}
                            onEditChange={setEditValue}
                            onEditSave={saveField}
                            onEditCancel={() => setEditingField(null)}
                          />
                          {/* Keterangan */}
                          <EditableObjectItem 
                            label="Keterangan" 
                            value={card.keterangan} 
                            icon="T" 
                            isEditing={editingField?.id === card.id && editingField?.field === "keterangan"}
                            editValue={editValue}
                            onEditStart={() => startEditingField(card, "keterangan", card.keterangan)}
                            onEditChange={setEditValue}
                            onEditSave={saveField}
                            onEditCancel={() => setEditingField(null)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EditableObjectItem({
  label,
  value,
  icon,
  isEditing,
  editValue,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel
}: {
  label: string;
  value: string;
  icon: string;
  isEditing: boolean;
  editValue: string;
  onEditStart: () => void;
  onEditChange: (val: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
}) {
  return (
    <div 
      className="flex items-center px-4 py-1 hover:bg-blue-100 cursor-pointer group border-b border-gray-100 border-l-2 border-l-transparent hover:border-l-blue-500"
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEditStart();
      }}
    >
      <div className="w-6 flex justify-center mr-2 text-gray-400">
        <span className="font-serif font-bold text-xs border border-gray-400 rounded px-0.5">
          {icon}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onBlur={onEditSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") onEditSave();
              if (e.key === "Escape") onEditCancel();
            }}
            className="w-full text-xs border border-blue-500 rounded px-1 py-0.5 focus:outline-none mt-0.5"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p className="text-xs text-gray-800 truncate font-mono mt-0.5" title={value}>
            {value}
          </p>
        )}
      </div>
      <div className="w-4 opacity-0 group-hover:opacity-100 flex items-center justify-center">
        {isEditing ? (
          <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" onClick={(e) => { e.stopPropagation(); onEditSave(); }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" onClick={(e) => { e.stopPropagation(); onEditStart(); }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        )}
      </div>
    </div>
  );
}
