export type ASTNode = 
  | ProgramNode
  | DeclarationNode
  | AssignmentNode
  | BinaryExpressionNode
  | LiteralNode
  | IdentifierNode
  | ForLoopNode
  | FunctionCallNode
  | ArrayAccessNode
  | ReturnNode
  | StringLiteralNode
  | UnaryExpressionNode
  | IfNode;

export interface ProgramNode {
  type: 'Program';
  body: ASTNode[];
}

export interface DeclarationNode {
  type: 'Declaration';
  varType: string;
  name: string;
  initializer?: ASTNode;
  isArray?: boolean;
  arraySize?: ASTNode;
  line: number;
}

export interface AssignmentNode {
  type: 'Assignment';
  name: string;
  expression: ASTNode;
  isArrayAccess?: boolean;
  arrayIndex?: ASTNode;
  line: number;
}

export interface BinaryExpressionNode {
  type: 'BinaryExpression';
  left: ASTNode;
  operator: string;
  right: ASTNode;
  line: number;
}

export interface LiteralNode {
  type: 'Literal';
  value: number;
  line: number;
}

export interface IdentifierNode {
  type: 'Identifier';
  name: string;
  line: number;
}

export interface ForLoopNode {
  type: 'ForLoop';
  init: ASTNode | null;
  condition: ASTNode | null;
  increment: ASTNode | null;
  body: ASTNode[];
  line: number;
}

export interface FunctionCallNode {
  type: 'FunctionCall';
  name: string;
  args: ASTNode[];
  line: number;
}

export interface ArrayAccessNode {
  type: 'ArrayAccess';
  name: string;
  index: ASTNode;
  line: number;
}

export interface ReturnNode {
  type: 'Return';
  value: ASTNode | null;
  line: number;
}

export interface StringLiteralNode {
  type: 'StringLiteral';
  value: string;
  line: number;
}

export interface UnaryExpressionNode {
  type: 'UnaryExpression';
  operator: string;
  argument: ASTNode;
  line: number;
}

export interface IfNode {
  type: 'If';
  condition: ASTNode;
  thenBody: ASTNode[];
  elseBody: ASTNode[];
  line: number;
}
