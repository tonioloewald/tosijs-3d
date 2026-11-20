import * as BABYLON from '@babylonjs/core';
import { B3dChild } from './b3d-utils.js';
import { type Conversation, type ConversationEvent, type ConversationHost, type ConversationScript } from './conversation.js';
import type { B3d } from './tosi-b3d.js';
import { type InputProvider } from './control-input.js';
interface Talker {
    mesh?: BABYLON.AbstractMesh | null;
    entries?: {
        skeletons?: BABYLON.Skeleton[];
        rootNodes?: BABYLON.TransformNode[];
    };
    perform?: (state: string, seconds?: number) => number;
    endPerform?: () => void;
    inputProvider?: InputProvider | null;
}
export declare class B3dConversation extends B3dChild {
    static preferredTagName: string;
    static initAttributes: {
        reach: number;
        balloonWidth: number;
    };
    reach: number;
    balloonWidth: number;
    /** The script ([[conversation]]). */
    script: ConversationScript | null;
    /** The game's side: what the player carries, giving, taking, trading. */
    host: ConversationHost;
    /** The running conversation, if any. */
    talk: Conversation | null;
    whenEvent: ((event: ConversationEvent, talk: Conversation) => void) | null;
    whenEnded: ((talk: Conversation) => void) | null;
    private _player;
    private _theirs;
    private _mine;
    private _obs;
    private _audio;
    private _fading;
    private _durations;
    private _keys;
    /** The biped this is nested in: who speaks the lines that are not the player's. */
    get speaker(): Talker | null;
    sceneReady(owner: B3d, scene: BABYLON.Scene): void;
    sceneDispose(): void;
    /** Begin the talk with `player` (a biped). Returns it, or null without a script or scene. */
    start(player?: unknown): Conversation | null;
    /** End the talk now. */
    stop(): void;
    private _lent;
    private _stopPad;
    private _cleanup;
    private _preload;
    private _ensurePlanes;
    private _isPlayer;
    private _event;
    private _play;
    private _stopAudio;
    private _frame;
    private _face;
    private _place;
    private _headTop;
}
export declare const b3dConversation: import("tosijs").ElementCreator<B3dConversation>;
export {};
//# sourceMappingURL=b3d-conversation.d.ts.map