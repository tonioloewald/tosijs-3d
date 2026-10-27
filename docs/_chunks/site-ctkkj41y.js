import{it}from"./site-v7dfb6ky.js";import{ct}from"./site-fn6dg0m5.js";import{o}from"./site-eq7hsr33.js";import{c}from"./site-h3pwfkan.js";class Du extends it{constructor(t){super(t);this.config=t,this.condition=this.registerDataInput("condition",ct),this.executionFlow=this._registerSignalOutput("executionFlow"),this.completed=this._registerSignalOutput("completed"),this._unregisterSignalOutput("out")}_execute(t,l){let i=this.condition.getValue(t);if(this.config?.doWhile&&!i)this.executionFlow._activateSignal(t);let e=0;while(i){if(this.executionFlow._activateSignal(t),++e,e>=Du.MaxLoopCount){c.Warn("FlowGraphWhileLoopBlock: Max loop count reached. Breaking.");break}i=this.condition.getValue(t)}this.completed._activateSignal(t)}getClassName(){return"FlowGraphWhileLoopBlock"}}Du.MaxLoopCount=1000;var r=!1;function ng(){if(r)return;r=!0,o("FlowGraphWhileLoopBlock",Du)}ng();
export{Du,ng};

//# debugId=C77F262313E97AC464756E2164756E21
//# sourceMappingURL=site-ctkkj41y.js.map
