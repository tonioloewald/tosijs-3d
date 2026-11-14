import{it}from"./site-3t3g319r.js";import{ct}from"./site-8r8s7x74.js";import{o}from"./site-twypjy9n.js";import{c}from"./site-h3pwfkan.js";class Bu extends it{constructor(t){super(t);this.config=t,this.condition=this.registerDataInput("condition",ct),this.executionFlow=this._registerSignalOutput("executionFlow"),this.completed=this._registerSignalOutput("completed"),this._unregisterSignalOutput("out")}_execute(t,l){let i=this.condition.getValue(t);if(this.config?.doWhile&&!i)this.executionFlow._activateSignal(t);let e=0;while(i){if(this.executionFlow._activateSignal(t),++e,e>=Bu.MaxLoopCount){c.Warn("FlowGraphWhileLoopBlock: Max loop count reached. Breaking.");break}i=this.condition.getValue(t)}this.completed._activateSignal(t)}getClassName(){return"FlowGraphWhileLoopBlock"}}Bu.MaxLoopCount=1000;var r=!1;function vg(){if(r)return;r=!0,o("FlowGraphWhileLoopBlock",Bu)}vg();
export{Bu,vg};

//# debugId=E24D096DBFA2917564756E2164756E21
//# sourceMappingURL=site-fbbx7ggc.js.map
