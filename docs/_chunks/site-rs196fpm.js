import{it}from"./site-x0v5x8t1.js";import{ct}from"./site-5stwdw2k.js";import{o}from"./site-4gwmbhmj.js";import{c}from"./site-h3pwfkan.js";class Fu extends it{constructor(t){super(t);this.config=t,this.condition=this.registerDataInput("condition",ct),this.executionFlow=this._registerSignalOutput("executionFlow"),this.completed=this._registerSignalOutput("completed"),this._unregisterSignalOutput("out")}_execute(t,l){let i=this.condition.getValue(t);if(this.config?.doWhile&&!i)this.executionFlow._activateSignal(t);let e=0;while(i){if(this.executionFlow._activateSignal(t),++e,e>=Fu.MaxLoopCount){c.Warn("FlowGraphWhileLoopBlock: Max loop count reached. Breaking.");break}i=this.condition.getValue(t)}this.completed._activateSignal(t)}getClassName(){return"FlowGraphWhileLoopBlock"}}Fu.MaxLoopCount=1000;var r=!1;function Sg(){if(r)return;r=!0,o("FlowGraphWhileLoopBlock",Fu)}Sg();
export{Fu,Sg};

//# debugId=9E2DDAEE28841F5764756E2164756E21
//# sourceMappingURL=site-rs196fpm.js.map
