import{tt}from"./site-5tw2831p.js";import{ut}from"./site-a5xw8xz8.js";import{a}from"./site-2e9r9891.js";import{l}from"./site-sqgademg.js";class Lu extends tt{constructor(t){super(t);this.config=t,this.condition=this.registerDataInput("condition",ut),this.executionFlow=this._registerSignalOutput("executionFlow"),this.completed=this._registerSignalOutput("completed"),this._unregisterSignalOutput("out")}_execute(t,r){let i=this.condition.getValue(t);if(this.config?.doWhile&&!i)this.executionFlow._activateSignal(t);let e=0;while(i){if(this.executionFlow._activateSignal(t),++e,e>=Lu.MaxLoopCount){l.Warn("FlowGraphWhileLoopBlock: Max loop count reached. Breaking.");break}i=this.condition.getValue(t)}this.completed._activateSignal(t)}getClassName(){return"FlowGraphWhileLoopBlock"}}Lu.MaxLoopCount=1000;var o=!1;function M_(){if(o)return;o=!0,a("FlowGraphWhileLoopBlock",Lu)}M_();
export{Lu,M_};

//# debugId=34A4A12DBEFAF84964756E2164756E21
//# sourceMappingURL=site-w47fz7z8.js.map
