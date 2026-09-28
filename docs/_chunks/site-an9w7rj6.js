import{tt}from"./site-c6g1b76s.js";import{ut}from"./site-wsw4wdqb.js";import{a}from"./site-3ge18yeb.js";import{l}from"./site-sqgademg.js";class Lu extends tt{constructor(t){super(t);this.config=t,this.condition=this.registerDataInput("condition",ut),this.executionFlow=this._registerSignalOutput("executionFlow"),this.completed=this._registerSignalOutput("completed"),this._unregisterSignalOutput("out")}_execute(t,r){let i=this.condition.getValue(t);if(this.config?.doWhile&&!i)this.executionFlow._activateSignal(t);let e=0;while(i){if(this.executionFlow._activateSignal(t),++e,e>=Lu.MaxLoopCount){l.Warn("FlowGraphWhileLoopBlock: Max loop count reached. Breaking.");break}i=this.condition.getValue(t)}this.completed._activateSignal(t)}getClassName(){return"FlowGraphWhileLoopBlock"}}Lu.MaxLoopCount=1000;var o=!1;function M_(){if(o)return;o=!0,a("FlowGraphWhileLoopBlock",Lu)}M_();
export{Lu,M_};

//# debugId=34A4A12DBEFAF84964756E2164756E21
//# sourceMappingURL=site-an9w7rj6.js.map
