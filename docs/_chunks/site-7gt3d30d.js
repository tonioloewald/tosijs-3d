import{Ye}from"./site-23z3qe8v.js";import{lt}from"./site-xp6e2pbe.js";var l="cachedOperationValue",t="cachedExecutionId";class hr extends Ye{constructor(e,i){super(i);this.value=this.registerDataOutput("value",e),this.isValid=this.registerDataOutput("isValid",lt)}_updateOutputs(e){let i=e._getExecutionVariable(this,t,-1),s=e._getExecutionVariable(this,l,null);if(s!==void 0&&s!==null&&i===e.executionId)this.isValid.setValue(!0,e),this.value.setValue(s,e);else try{let a=this._doOperation(e);if(a===void 0||a===null){this.isValid.setValue(!1,e);return}e._setExecutionVariable(this,l,a),e._setExecutionVariable(this,t,e.executionId),this.value.setValue(a,e),this.isValid.setValue(!0,e)}catch(a){this.isValid.setValue(!1,e)}}}
export{hr};

//# debugId=AA7E2956732350FD64756E2164756E21
//# sourceMappingURL=site-7gt3d30d.js.map
