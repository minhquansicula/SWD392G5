import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/app_content.dart';
import '../models/password_link_model.dart';
import '../providers/auth_provider.dart';

class ForgotPasswordScreen extends StatefulWidget {
  final String? prefilledEmail;
  final String? initialToken;
  final int initialTabIndex;
  final bool isFromProfile;

  const ForgotPasswordScreen({
    super.key,
    this.prefilledEmail,
    this.initialToken,
    this.initialTabIndex = 0,
    this.isFromProfile = false,
  });

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Tab 1: Request Reset Link
  final _emailController = TextEditingController();
  bool _isSendingEmail = false;
  String? _sendEmailSuccessMessage;
  String? _sendEmailErrorMessage;

  // Tab 2: Set New Password
  final _tokenController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _isCheckingToken = false;
  PasswordLinkInfoModel? _verifiedLinkInfo;
  String? _tokenError;

  bool _obscureNewPass = true;
  bool _obscureConfirmPass = true;
  bool _isSubmittingNewPass = false;
  String? _setPasswordError;
  bool _isSuccessCompleted = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 2,
      vsync: this,
      initialIndex: widget.initialTabIndex.clamp(0, 1),
    );

    if (widget.prefilledEmail != null) {
      _emailController.text = widget.prefilledEmail!;
    }

    if (widget.initialToken != null && widget.initialToken!.isNotEmpty) {
      _tokenController.text = widget.initialToken!;
      _tabController.index = 1;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _validateToken();
      });
    }

    _newPasswordController.addListener(() {
      setState(() {});
    });
    _confirmPasswordController.addListener(() {
      setState(() {});
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _emailController.dispose();
    _tokenController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  // --- ACTIONS TAB 1: Gửi yêu cầu link ---
  Future<void> _handleSendResetLink() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      setState(() {
        _sendEmailErrorMessage =
            'Vui lòng nhập địa chỉ Email tài khoản của bạn';
        _sendEmailSuccessMessage = null;
      });
      return;
    }

    setState(() {
      _isSendingEmail = true;
      _sendEmailErrorMessage = null;
      _sendEmailSuccessMessage = null;
    });

    final auth = context.read<AuthProvider>();
    final res = await auth.requestForgotPassword(email);

    if (!mounted) return;

    setState(() {
      _isSendingEmail = false;
    });

    if (res.success) {
      setState(() {
        _sendEmailSuccessMessage =
            'Đã gửi liên kết đặt lại mật khẩu! Nếu email "$email" thuộc về một tài khoản hợp lệ trên hệ thống AIVES, bạn sẽ nhận được hướng dẫn và mã Token trong hộp thư đến (hoặc hòm thư Spam).';
        _sendEmailErrorMessage = null;
      });
    } else {
      setState(() {
        _sendEmailErrorMessage = res.message.isNotEmpty
            ? res.message
            : 'Không thể gửi email. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.';
      });
    }
  }

  // --- ACTIONS TAB 2: Kiểm tra Token ---
  Future<void> _validateToken() async {
    final rawInput = _tokenController.text.trim();
    final cleanToken = PasswordPolicyUtils.extractToken(rawInput);

    if (cleanToken.isEmpty) {
      setState(() {
        _tokenError = 'Vui lòng nhập hoặc dán mã Token từ email';
        _verifiedLinkInfo = null;
      });
      return;
    }

    // Update text controller if full URL was pasted
    if (cleanToken != rawInput) {
      _tokenController.text = cleanToken;
    }

    setState(() {
      _isCheckingToken = true;
      _tokenError = null;
      _verifiedLinkInfo = null;
      _setPasswordError = null;
    });

    try {
      final auth = context.read<AuthProvider>();
      final linkInfo = await auth.checkPasswordLink(cleanToken);

      if (!mounted) return;

      setState(() {
        _isCheckingToken = false;
        _verifiedLinkInfo = linkInfo;
        _tokenError = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isCheckingToken = false;
        _verifiedLinkInfo = null;
        _tokenError = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _pasteFromClipboard() async {
    final data = await Clipboard.getData('text/plain');
    if (data?.text != null && data!.text!.trim().isNotEmpty) {
      final extracted = PasswordPolicyUtils.extractToken(data.text!.trim());
      _tokenController.text = extracted;
      _validateToken();
    }
  }

  // --- ACTIONS TAB 2: Đặt mật khẩu mới ---
  Future<void> _handleSetPassword() async {
    final token = PasswordPolicyUtils.extractToken(_tokenController.text);
    final newPass = _newPasswordController.text;
    final confirmPass = _confirmPasswordController.text;

    if (token.isEmpty) {
      setState(() => _setPasswordError = 'Vui lòng nhập mã Token hợp lệ');
      return;
    }

    final eval = PasswordPolicyUtils.evaluatePassword(newPass);
    if (!eval.isValid) {
      setState(() => _setPasswordError = eval.errorMessage);
      return;
    }

    if (newPass != confirmPass) {
      setState(() => _setPasswordError = 'Mật khẩu nhập lại không khớp');
      return;
    }

    setState(() {
      _isSubmittingNewPass = true;
      _setPasswordError = null;
    });

    final auth = context.read<AuthProvider>();
    final res = await auth.setPasswordWithToken(
      rawInput: token,
      newPassword: newPass,
    );

    if (!mounted) return;

    setState(() {
      _isSubmittingNewPass = false;
    });

    if (res.success) {
      setState(() {
        _isSuccessCompleted = true;
      });
    } else {
      setState(() {
        _setPasswordError = res.message.isNotEmpty
            ? res.message
            : 'Không thể đặt lại mật khẩu. Link có thể đã hết hạn hoặc không hợp lệ.';
      });
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(widget.isFromProfile ? 'Đổi mật khẩu' : 'Khôi phục mật khẩu'),
    ),
    body: SafeArea(
      child: AppContent(
        child: Column(
          children: [
            if (!_isSuccessCompleted)
              TabBar(
                controller: _tabController,
                isScrollable: true,
                tabAlignment: TabAlignment.start,
                tabs: const [
                  Tab(text: '1. Gửi email'),
                  Tab(text: '2. Đặt mật khẩu'),
                ],
              ),
            Expanded(
              child: _isSuccessCompleted
                  ? ListView(
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      children: [
                        const AppMessage(
                          message:
                              'Mật khẩu đã được cập nhật. Vui lòng đăng nhập bằng mật khẩu mới.',
                        ),
                        const SizedBox(height: 16),
                        PrimaryButton(
                          text: 'Quay lại',
                          onPressed: () => Navigator.of(context).pop(),
                        ),
                      ],
                    )
                  : TabBarView(
                      controller: _tabController,
                      children: [_requestForm(), _passwordForm()],
                    ),
            ),
          ],
        ),
      ),
    ),
  );

  Widget _requestForm() => ListView(
    padding: const EdgeInsets.symmetric(vertical: 24),
    children: [
      Text('Nhận liên kết khôi phục', style: AppTextStyles.headlineMd),
      const SizedBox(height: 12),
      Text(
        'Nhập email tài khoản của bạn. Kiểm tra cả hộp thư rác sau khi gửi yêu cầu.',
        style: AppTextStyles.bodyMd,
      ),
      const SizedBox(height: 24),
      TextField(
        controller: _emailController,
        enabled: !_isSendingEmail,
        autofillHints: const [AutofillHints.email],
        keyboardType: TextInputType.emailAddress,
        textInputAction: TextInputAction.done,
        onSubmitted: (_) {
          if (!_isSendingEmail) _handleSendResetLink();
        },
        decoration: InputDecoration(
          labelText: 'Email tài khoản',
          errorText: _sendEmailErrorMessage,
          errorMaxLines: 5,
        ),
      ),
      const SizedBox(height: 16),
      PrimaryButton(
        text: 'Gửi liên kết',
        icon: Icons.mail_outline,
        isLoading: _isSendingEmail,
        onPressed: _handleSendResetLink,
      ),
      if (_sendEmailSuccessMessage != null)
        Padding(
          padding: const EdgeInsets.only(top: 16),
          child: AppMessage(message: _sendEmailSuccessMessage!),
        ),
    ],
  );

  Widget _passwordForm() => ListView(
    padding: const EdgeInsets.symmetric(vertical: 24),
    children: [
      Text('Đặt mật khẩu mới', style: AppTextStyles.headlineMd),
      const SizedBox(height: 12),
      Text(
        'Dán liên kết hoặc mã xác nhận nhận được từ email.',
        style: AppTextStyles.bodyMd,
      ),
      const SizedBox(height: 16),
      TextField(
        controller: _tokenController,
        enabled: !_isCheckingToken && !_isSubmittingNewPass,
        autocorrect: false,
        enableSuggestions: false,
        onChanged: (_) => setState(() => _verifiedLinkInfo = null),
        decoration: InputDecoration(
          labelText: 'Liên kết hoặc mã xác nhận',
          errorText: _tokenError,
          errorMaxLines: 5,
        ),
        onSubmitted: (_) {
          if (!_isCheckingToken) _validateToken();
        },
      ),
      const SizedBox(height: 8),
      TextButton.icon(
        onPressed: _isCheckingToken || _isSubmittingNewPass
            ? null
            : _pasteFromClipboard,
        icon: const Icon(Icons.content_paste),
        label: const Text('Dán từ bộ nhớ tạm'),
      ),
      PrimaryButton(
        text: 'Kiểm tra mã',
        isOutlined: true,
        isLoading: _isCheckingToken,
        onPressed: _isSubmittingNewPass ? null : _validateToken,
      ),
      if (_verifiedLinkInfo != null) ...[
        const SizedBox(height: 16),
        AppMessage(
          message: 'Đã xác nhận tài khoản ${_verifiedLinkInfo!.email}',
        ),
      ],
      const SizedBox(height: 24),
      TextField(
        controller: _newPasswordController,
        obscureText: _obscureNewPass,
        enabled: !_isSubmittingNewPass,
        autofillHints: const [AutofillHints.newPassword],
        autocorrect: false,
        enableSuggestions: false,
        decoration: InputDecoration(
          labelText: 'Mật khẩu mới',
          helperText: 'Tối thiểu 8 ký tự, tối đa 72 byte UTF-8.',
          helperMaxLines: 3,
          suffixIcon: IconButton(
            tooltip: _obscureNewPass ? 'Hiện mật khẩu mới' : 'Ẩn mật khẩu mới',
            onPressed: () => setState(() => _obscureNewPass = !_obscureNewPass),
            icon: Icon(
              _obscureNewPass
                  ? Icons.visibility_outlined
                  : Icons.visibility_off_outlined,
            ),
          ),
        ),
      ),
      const SizedBox(height: 16),
      TextField(
        controller: _confirmPasswordController,
        obscureText: _obscureConfirmPass,
        enabled: !_isSubmittingNewPass,
        autofillHints: const [AutofillHints.newPassword],
        autocorrect: false,
        enableSuggestions: false,
        textInputAction: TextInputAction.done,
        onSubmitted: (_) {
          if (!_isSubmittingNewPass && _verifiedLinkInfo != null) {
            _handleSetPassword();
          }
        },
        decoration: InputDecoration(
          labelText: 'Nhập lại mật khẩu',
          errorText: _setPasswordError,
          errorMaxLines: 5,
          suffixIcon: IconButton(
            tooltip: _obscureConfirmPass
                ? 'Hiện mật khẩu xác nhận'
                : 'Ẩn mật khẩu xác nhận',
            onPressed: () =>
                setState(() => _obscureConfirmPass = !_obscureConfirmPass),
            icon: Icon(
              _obscureConfirmPass
                  ? Icons.visibility_outlined
                  : Icons.visibility_off_outlined,
            ),
          ),
        ),
      ),
      const SizedBox(height: 24),
      PrimaryButton(
        text: 'Lưu mật khẩu',
        icon: Icons.lock_outline,
        isLoading: _isSubmittingNewPass,
        onPressed: _verifiedLinkInfo != null ? _handleSetPassword : null,
      ),
    ],
  );
}
