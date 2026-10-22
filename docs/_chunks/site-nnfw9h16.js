import{tt}from"./site-d92hj336.js";import{ct}from"./site-q1pk93qz.js";import{o}from"./site-synvytjq.js";import{c}from"./site-h3pwfkan.js";class Du extends tt{constructor(t){super(t);this.config=t,this.condition=this.registerDataInput("condition",ct),this.executionFlow=this._registerSignalOutput("executionFlow"),this.completed=this._registerSignalOutput("completed"),this._unregisterSignalOutput("out")}_execute(t,l){let i=this.condition.getValue(t);if(this.config?.doWhile&&!i)this.executionFlow._activateSignal(t);let e=0;while(i){if(this.executionFlow._activateSignal(t),++e,e>=Du.MaxLoopCount){c.Warn("FlowGraphWhileLoopBlock: Max loop count reached. Breaking.");break}i=this.condition.getValue(t)}this.completed._activateSignal(t)}getClassName(){return"FlowGraphWhileLoopBlock"}}Du.MaxLoopCount=1000;var r=!1;function n_(){if(r)return;r=!0,o("FlowGraphWhileLoopBlock",Du)}n_();
export{Du,n_};

//# debugId=EA273F2CDBABF3A064756E2164756E21
//# sourceMappingURL=site-nnfw9h16.js.map
