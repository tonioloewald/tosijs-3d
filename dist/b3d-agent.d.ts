import { type ControlNode } from './widget-semantics.js';
/** What a scene lets an agent do: nothing, read, or read and act. */
export type AgentExposure = 'off' | 'read' | 'on';
/** One tool, in WebMCP's shape, plus whether it changes anything. */
export interface B3dAgentTool {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    /** Changes the world (set, press, drive): offered only at `on`. */
    write?: boolean;
    execute: (input: Record<string, unknown>) => unknown;
}
/** What a scene gives the registry (a `<tosi-b3d>`). */
export interface AgentSceneHost {
    /** Its name in tool names; made safe by the registry. */
    agentName(): string;
    /** Its own setting: '' follows the page. */
    agentExposure(): AgentExposure | '';
    /** The tools it offers, unprefixed (`panel`, `panel_set`, …). */
    agentTools(): B3dAgentTool[];
    readonly hasInputFocus?: boolean;
    readonly isConnected?: boolean;
}
/** What the panel tools need from a scene. */
export interface PanelAgentHost {
    /** The settings panel as named controls. `fresh` false reuses the last build. */
    agentControls(fresh?: boolean): ControlNode[];
    /** Is the panel on screen? */
    agentPanelOpen(): boolean;
}
/** What the scene tools read from a scene (a `<tosi-b3d>`), duck-typed. */
export interface SceneAgentHost {
    querySelector(selector: string): Element | null;
    querySelectorAll(selector: string): ArrayLike<Element>;
    readonly scene?: {
        activeCamera?: unknown;
    } | null;
    /** How far the floating origin has moved (world = scene + offset). */
    readonly originOffset?: {
        x: number;
        z: number;
    };
    weatherHere?(): unknown;
    snapshot?(opts?: {
        width?: number;
        height?: number;
    }): Promise<string>;
    /** Make this the scene the shared controls drive. */
    takeInputFocus?(): void;
}
/** One named thing in a scene, as the scene tools report it. */
export interface AgentEntity {
    name: string;
    /** Its element's tag without `tosi-b3d-`: `car`, `biped`, `beacon`… */
    kind: string;
    /** World metres, y up: the same place whatever the floating origin did. */
    at: [number, number, number];
    /** Degrees: 0 faces +z, 90 faces +x. */
    heading?: number;
    focused?: boolean;
    /** Metres from you (the focused controllable, else the camera). */
    distance?: number;
    /** The distance as a word (world-topology's proximity rungs). */
    near?: string;
    /** Degrees from where you face to it: negative is left, positive right. */
    bearing?: number;
}
/** The named things in a scene, nearest first. */
export declare function sceneEntities(host: SceneAgentHost): {
    you: AgentEntity | null;
    camera: {
        at: [number, number, number];
        heading?: number;
    } | null;
    entities: AgentEntity[];
};
/** The scene's own tools: what is in it, its picture, its named places. */
export declare function sceneTools(host: SceneAgentHost): B3dAgentTool[];
/** Drive the controllable in focus with its own controls: hold, go, status, stop. */
export declare function controlTools(host: SceneAgentHost): B3dAgentTool[];
/** The settings-panel tools for one scene. */
export declare function panelTools(host: PanelAgentHost): B3dAgentTool[];
/** A name safe in a tool name: lower case, letters, digits and `_`. */
export declare function toolSafe(name: string): string;
/** What a scene exposes: its own setting, else the page's. */
export declare function exposureOf(own: AgentExposure | '', page: AgentExposure): AgentExposure;
/** Every tool the page offers now, prefixed, under each scene's exposure. */
export declare function sceneAgentTools(): B3dAgentTool[];
/** Call a tool by name; refuses one the page does not offer. */
export declare function callSceneTool(name: string, input?: Record<string, unknown>): Promise<unknown>;
/** `window.b3dAgent`: the same tools with no WebMCP host. */
export interface B3dAgentGlobal {
    tools(): Array<{
        name: string;
        description: string;
        inputSchema: Record<string, unknown>;
    }>;
    call(name: string, input?: Record<string, unknown>): Promise<unknown>;
    /** Re-register with the browser after scenes change name or exposure. */
    sync(): void;
}
/**
 * Open every scene on the page to agents: `expose: 'all'` (read, set, press,
 * drive), `'read'`, or `'none'` (the default). A scene's own `agent`
 * attribute wins. `webmcp: false` keeps the tools off the browser's registry
 * (they stay on `window.b3dAgent`).
 */
export declare function enableSceneAgents(options?: {
    expose?: 'all' | 'read' | 'none';
    webmcp?: boolean;
}): B3dAgentGlobal;
/** A scene joins (on connect) or leaves (on teardown) the page's registry. */
export declare function registerAgentScene(s: AgentSceneHost): () => void;
/** Install `window.b3dAgent` and bring the browser's registry into line. */
export declare function syncAgents(): void;
/** Testing only: forget every scene, the page's exposure and registrations. */
export declare function _resetSceneAgents(): void;
//# sourceMappingURL=b3d-agent.d.ts.map